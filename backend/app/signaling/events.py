import socketio
from datetime import datetime, timedelta
from app.services.broadcast_service import BroadcastService
from app.database import SessionLocal
from app.services.notification_service import NotificationService
from app.models.chat_message import ChatMessage as ChatMessageModel

from app.config import settings

MAX_CHAT_MESSAGE_LENGTH = settings.MAX_CHAT_MESSAGE_LENGTH
ALLOWED_ROLES = {"principal", "admin", "teacher", "staff"}
MAIN_ROOM = "main-session"

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.origins_list,
    logger=False,
    ping_timeout=60,
    ping_interval=25,
)

broadcast_service = BroadcastService()

room_members: dict[str, set[str]] = {}

chat_history: dict[str, list[dict]] = {}
CHAT_HISTORY_LIMIT = 200


@sio.event
async def connect(sid, environ, auth):
    print(f"[Backend] connect: sid={sid}, auth={bool(auth)}")
    if not auth or "token" not in auth:
        raise socketio.exceptions.ConnectionRefusedError("Authentication required")

    user = await broadcast_service.authenticate_user(auth["token"])
    if not user:
        raise socketio.exceptions.ConnectionRefusedError("Invalid token")

    await sio.save_session(sid, {
        "user_id": str(user.id),
        "full_name": user.full_name,
        "role": user.role,
        "campus": user.campus,
    })

    await sio.enter_room(sid, f"user_{user.id}")

    print(f"[Backend] User connected: {user.full_name} ({user.campus}), sid={sid}")


@sio.event
async def disconnect(sid, reason=""):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return

    user_id = session.get("user_id")
    room_id = session.get("current_room")
    if room_id:
        if room_id in room_members and sid in room_members[room_id]:
            room_members[room_id].discard(sid)

        try:
            await sio.emit("peer_left", {
                "sid": sid,
                "user": session.get("full_name"),
                "campus": session.get("campus"),
                "role": session.get("role"),
            }, room=room_id)
            await sio.leave_room(sid, room_id)
        except Exception:
            pass

        await _broadcast_room_users(room_id)

    if user_id:
        try:
            await sio.leave_room(sid, f"user_{user_id}")
        except Exception:
            pass

    print(f"[Backend] User disconnected: {sid}")


@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")
    if not room_id or not isinstance(room_id, str) or len(room_id) > 100:
        return

    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        print(f"[Backend] join_room FAILED: no session for {sid}")
        return

    print(f"[Backend] Session: user={session.get('full_name')}, campus={session.get('campus')}")

    if room_id not in room_members:
        room_members[room_id] = set()

    user_id = session.get("user_id")
    stale_sids = []
    for existing_sid in list(room_members[room_id]):
        try:
            existing_session = await sio.get_session(existing_sid)
            if existing_session and existing_session.get("user_id") == user_id:
                stale_sids.append(existing_sid)
        except (KeyError, Exception):
            stale_sids.append(existing_sid)

    for stale_sid in stale_sids:
        room_members[room_id].discard(stale_sid)
        try:
            await sio.leave_room(stale_sid, room_id)
        except Exception:
            pass

    room_members[room_id].add(sid)

    await sio.enter_room(sid, room_id)
    session["current_room"] = room_id
    session["portal_active"] = True
    session["portal_meeting"] = False

    await sio.emit("peer_joined", {
        "sid": sid,
        "user": session.get("full_name"),
        "campus": session.get("campus"),
        "role": session.get("role"),
    }, room=room_id, skip_sid=sid)

    await _broadcast_room_users(room_id)

    for existing_sid in list(room_members[room_id]):
        if existing_sid == sid:
            continue
        try:
            existing_session = await sio.get_session(existing_sid)
            if existing_session:
                await sio.emit("peer_portal_mode", {
                    "sid": existing_sid,
                    "active": existing_session.get("portal_active", True),
                    "meeting": existing_session.get("portal_meeting", False),
                }, room=sid)
        except (KeyError, Exception):
            pass

    history = chat_history.get(room_id, [])
    if not history:
        try:
            db = SessionLocal()
            db_msgs = (
                db.query(ChatMessageModel)
                .filter(ChatMessageModel.room_id == room_id)
                .order_by(ChatMessageModel.created_at.desc())
                .limit(100)
                .all()
            )
            db.close()
            if db_msgs:
                db_msgs.reverse()
                history = [
                    {
                        "id": str(m.id),
                        "user": m.full_name,
                        "campus": m.campus,
                        "role": m.role,
                        "message": m.message,
                        "target": m.target,
                        "campus_scope": m.campus_scope,
                        "timestamp": m.created_at.isoformat() if m.created_at else "",
                        "reply_to_id": str(m.reply_to_id) if m.reply_to_id else None,
                        "reply_to_user": m.reply_to_user,
                        "reply_to_message": m.reply_to_message,
                    }
                    for m in db_msgs
                ]
                chat_history[room_id] = history[-CHAT_HISTORY_LIMIT:]
        except Exception as e:
            print(f"[Backend] chat_history DB fetch error: {e}")

    print(f"[Backend] join_room history check: room={room_id}, history_len={len(history)}, for={session.get('full_name')}")
    if history:
        await sio.emit("chat_history", {"messages": history[-100:]}, room=sid)
        print(f"[Backend] Sent {len(history[-100:])} chat history messages to {session.get('full_name')}")
    else:
        await sio.emit("chat_history", {"messages": []}, room=sid)
        print(f"[Backend] No chat history for {session.get('full_name')} in room {room_id}")


@sio.event
async def leave_room(sid, data):
    room_id = data.get("room_id")
    if not room_id:
        return

    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return

    await sio.emit("peer_left", {
        "sid": sid,
        "user": session.get("full_name"),
        "campus": session.get("campus"),
        "role": session.get("role"),
    }, room=room_id)
    await sio.leave_room(sid, room_id)
    session.pop("current_room", None)

    if room_id in room_members:
        room_members[room_id].discard(sid)

    await _broadcast_room_users(room_id)


async def _broadcast_room_users(room_id: str):
    members = room_members.get(room_id, set())
    room_users = []
    portal_states = {}
    for member_sid in list(members):
        try:
            member_session = await sio.get_session(member_sid)
            if member_session:
                room_users.append({
                    "sid": member_sid,
                    "user": member_session.get("full_name"),
                    "campus": member_session.get("campus"),
                    "role": member_session.get("role"),
                })
                portal_states[member_sid] = {
                    "active": member_session.get("portal_active", True),
                    "meeting": member_session.get("portal_meeting", False),
                }
        except (KeyError, Exception):
            room_members.get(room_id, set()).discard(member_sid)

    print(f"[Backend] Broadcasting room_users ({len(room_users)} users) to room={room_id}: {[u['user'] for u in room_users]}")
    await sio.emit("room_users", {"users": room_users, "portal_states": portal_states}, room=room_id)


@sio.event
async def webrtc_offer(sid, data):
    target_sid = data.get("target_sid")
    if target_sid and isinstance(target_sid, str):
        try:
            session = await sio.get_session(sid)
        except (KeyError, Exception):
            return
        print(f"[Backend] webrtc_offer: {sid} -> {target_sid} ({session.get('full_name')})")
        await sio.emit("webrtc_offer", {
            "offer": data.get("offer"),
            "sender_sid": sid,
            "sender_name": session.get("full_name"),
            "sender_campus": session.get("campus"),
        }, room=target_sid)


@sio.event
async def webrtc_answer(sid, data):
    target_sid = data.get("target_sid")
    if target_sid and isinstance(target_sid, str):
        try:
            session = await sio.get_session(sid)
        except (KeyError, Exception):
            return
        print(f"[Backend] webrtc_answer: {sid} -> {target_sid} ({session.get('full_name')})")
        await sio.emit("webrtc_answer", {
            "answer": data.get("answer"),
            "sender_sid": sid,
            "sender_name": session.get("full_name"),
        }, room=target_sid)


@sio.event
async def ice_candidate(sid, data):
    target_sid = data.get("target_sid")
    if target_sid and isinstance(target_sid, str):
        await sio.emit("ice_candidate", {
            "candidate": data.get("candidate"),
            "sender_sid": sid,
        }, room=target_sid)


@sio.event
async def mute_audio(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if room_id:
        await sio.emit("peer_muted", {
            "sid": sid,
            "user": session.get("full_name"),
            "muted": data.get("muted", True),
        }, room=room_id, skip_sid=sid)


@sio.event
async def mute_video(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if room_id:
        await sio.emit("peer_video_toggled", {
            "sid": sid,
            "user": session.get("full_name"),
            "video_off": data.get("video_off", True),
        }, room=room_id, skip_sid=sid)


@sio.event
async def screen_share_start(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if room_id:
        await sio.emit("screen_share_started", {
            "sid": sid,
            "user": session.get("full_name"),
        }, room=room_id, skip_sid=sid)


@sio.event
async def screen_share_stop(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if room_id:
        await sio.emit("screen_share_stopped", {
            "sid": sid,
            "user": session.get("full_name"),
        }, room=room_id, skip_sid=sid)


@sio.event
async def emergency_trigger(sid, data):
    print(f"[Backend] emergency_trigger received from sid={sid}, data={data}")
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        print(f"[Backend] emergency_trigger: no session for sid={sid}")
        return
    if session.get("role") not in ["principal", "admin"]:
        print(f"[Backend] emergency_trigger: unauthorized role={session.get('role')}")
        await sio.emit("error", {"message": "Unauthorized"}, room=sid)
        return

    emergency_msg = data.get("message", "Emergency broadcast")
    if len(emergency_msg) > 500:
        emergency_msg = emergency_msg[:500]

    role = session.get("role")
    campus = session.get("campus")
    full_name = session.get("full_name")
    role_label = role.capitalize()
    campus_label = campus.replace("_", " ").title() if campus else "Unknown"

    mode = data.get("mode", "live")
    is_campus_only = mode in ("portal", "meeting")

    alert_payload = {
        "triggered_by": full_name,
        "triggered_by_role": role_label,
        "triggered_by_sid": sid,
        "campus": campus,
        "campus_label": campus_label,
        "message": emergency_msg,
        "campus_only": is_campus_only,
    }

    if is_campus_only and campus:
        members = room_members.get(MAIN_ROOM, set())
        for member_sid in list(members):
            try:
                member_session = await sio.get_session(member_sid)
                if member_session and (member_session.get("campus") == campus or member_session.get("role") == "admin"):
                    await sio.emit("emergency_alert", alert_payload, room=member_sid)
            except (KeyError, Exception):
                pass
        print(f"[Backend] Emergency (campus={campus}): {full_name}: {emergency_msg[:50]}")
    else:
        await sio.emit("emergency_alert", alert_payload)
        print(f"[Backend] Emergency (ALL): {full_name}: {emergency_msg[:50]}")

    try:
        await broadcast_service.log_emergency(
            type("User", (), {"id": session.get("user_id")})(),
            {"message": emergency_msg},
        )
    except Exception as e:
        print(f"[Backend] log_emergency error: {e}")

    try:
        db = SessionLocal()
        notif_service = NotificationService(db)
        notif_service.create_for_all(
            title="Emergency Alert",
            message=emergency_msg,
            notif_type="emergency",
        )
        db.close()
    except Exception:
        pass


@sio.event
async def emergency_dismiss(sid, data=None):
    print(f"[Backend] emergency_dismiss received from sid={sid}")
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    if session.get("role") not in ["principal", "admin"]:
        await sio.emit("error", {"message": "Unauthorized"}, room=sid)
        return

    dismissor_campus = session.get("campus")
    dismissor_role = session.get("role")

    if dismissor_role == "admin":
        await sio.emit("emergency_dismissed")
        print(f"[Backend] Emergency dismissed by admin {session.get('full_name')}")
    else:
        members = room_members.get(MAIN_ROOM, set())
        for member_sid in list(members):
            try:
                member_session = await sio.get_session(member_sid)
                if member_session and (member_session.get("campus") == dismissor_campus or member_session.get("role") == "admin"):
                    await sio.emit("emergency_dismissed", room=member_sid)
            except (KeyError, Exception):
                pass
        print(f"[Backend] Emergency dismissed by {dismissor_role} {session.get('full_name')} (campus={dismissor_campus})")


@sio.event
async def bulletin_update(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    if session.get("role") not in ["principal", "admin"]:
        return

    title = data.get("title", "New Bulletin")
    content = data.get("content", "")
    if len(title) > 200:
        title = title[:200]
    if len(content) > 2000:
        content = content[:2000]

    await sio.emit("bulletin_new", {
        "title": title,
        "content": content,
        "type": data.get("type", "bulletin"),
        "link": data.get("link"),
        "image_url": data.get("image_url"),
        "target_campus": data.get("target_campus", "both"),
        "created_by": session.get("full_name"),
    })

    try:
        db = SessionLocal()
        notif_service = NotificationService(db)
        creator_name = session.get("full_name", "Unknown")
        notif_service.create_for_all(
            title=f"{title}",
            message=f"Posted by {creator_name}. {content}" if content else f"Posted by {creator_name}",
            notif_type=data.get("type", "bulletin"),
        )
        db.close()
    except Exception:
        pass


@sio.event
async def reaction_update(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    if not session:
        return

    announcement_id = data.get("announcement_id")
    emoji = data.get("emoji")
    action = data.get("action")
    if not announcement_id or not emoji or not action:
        return

    await sio.emit("reaction_update", {
        "announcement_id": announcement_id,
        "emoji": emoji,
        "action": action,
        "user": session.get("full_name"),
    })


@sio.event
async def chat_reaction_update(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    if not session:
        return

    message_id = data.get("message_id")
    emoji = data.get("emoji")
    action = data.get("action")
    room_id = session.get("current_room")
    if not message_id or not emoji or not action or not room_id:
        return

    await sio.emit("chat_reaction_update", {
        "message_id": message_id,
        "emoji": emoji,
        "action": action,
        "user": session.get("full_name"),
    }, room=room_id)


@sio.event
async def chat_message(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    if not session:
        return

    room_id = session.get("current_room")
    if not room_id:
        return

    message = data.get("message", "").strip()
    if not message:
        return

    if len(message) > MAX_CHAT_MESSAGE_LENGTH:
        message = message[:MAX_CHAT_MESSAGE_LENGTH]

    target = data.get("target", "all")
    sender_campus = session.get("campus")
    scope = data.get("campus_scope", sender_campus) if target == "campus" else None
    timestamp = datetime.utcnow().isoformat()

    reply_to_id = data.get("reply_to_id")
    reply_to_user = data.get("reply_to_user")
    reply_to_message = data.get("reply_to_message")

    import uuid as _uuid
    msg_id = str(_uuid.uuid4())

    msg_data = {
        "id": msg_id,
        "sid": sid,
        "user": session.get("full_name"),
        "campus": sender_campus,
        "role": session.get("role"),
        "message": message,
        "target": target,
        "campus_scope": scope,
        "timestamp": timestamp,
    }

    if reply_to_id:
        msg_data["reply_to_id"] = reply_to_id
        msg_data["reply_to_user"] = reply_to_user
        msg_data["reply_to_message"] = reply_to_message

    if room_id not in chat_history:
        chat_history[room_id] = []

    try:
        db = SessionLocal()
        db_msg = ChatMessageModel(
            id=_uuid.UUID(msg_id),
            user_id=session.get("user_id"),
            full_name=session.get("full_name"),
            campus=sender_campus,
            role=session.get("role"),
            message=message,
            target=target,
            campus_scope=scope,
            room_id=room_id,
            reply_to_id=reply_to_id,
            reply_to_user=reply_to_user,
            reply_to_message=reply_to_message,
            created_at=datetime.utcnow(),
        )
        db.add(db_msg)
        db.commit()
        db.close()
        print(f"[Backend] chat_message saved to DB: {session.get('full_name')}: {message[:50]}")
    except Exception as e:
        print(f"[Backend] chat_message DB save error: {e}")

    chat_history[room_id].append(msg_data)
    if len(chat_history[room_id]) > CHAT_HISTORY_LIMIT:
        chat_history[room_id] = chat_history[room_id][-CHAT_HISTORY_LIMIT:]

    await sio.emit("chat_message", msg_data, room=room_id)


@sio.event
async def talk_to(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return

    target = data.get("target")
    room_id = session.get("current_room")
    campus = session.get("campus")
    if not room_id:
        return

    if target == "local":
        target = campus

    print(f"[Backend] talk_to: {session.get('full_name')} ({campus}) -> {target}")
    await sio.emit("peer_talk_target", {
        "sid": sid,
        "campus": campus,
        "target": target,
    }, room=room_id, skip_sid=sid)


@sio.event
async def portal_mode_changed(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return

    room_id = session.get("current_room")
    active = data.get("active", False)
    meeting = data.get("meeting", False)
    if not room_id:
        return

    print(f"[Backend] portal_mode_changed: {session.get('full_name')} ({session.get('campus')}) -> active={active}, meeting={meeting}")
    session["portal_active"] = active
    session["portal_meeting"] = meeting
    await sio.emit("peer_portal_mode", {
        "sid": sid,
        "active": active,
        "meeting": meeting,
    }, room=room_id, skip_sid=sid)


@sio.event
async def raise_hand(sid, data=None):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if not room_id:
        return
    await sio.emit("peer_hand_raised", {
        "sid": sid,
        "user": session.get("full_name"),
        "campus": session.get("campus"),
        "role": session.get("role"),
        "raised": True,
    }, room=room_id, skip_sid=sid)
    print(f"[Backend] hand_raised: {session.get('full_name')} in {room_id}")


@sio.event
async def lower_hand(sid, data=None):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if not room_id:
        return
    await sio.emit("peer_hand_raised", {
        "sid": sid,
        "user": session.get("full_name"),
        "campus": session.get("campus"),
        "role": session.get("role"),
        "raised": False,
    }, room=room_id, skip_sid=sid)
    print(f"[Backend] hand_lowered: {session.get('full_name')} in {room_id}")


@sio.event
async def send_reaction(sid, data):
    try:
        session = await sio.get_session(sid)
    except (KeyError, Exception):
        return
    room_id = session.get("current_room")
    if not room_id:
        return

    emoji = data.get("emoji")
    if not emoji or len(emoji) > 10:
        return

    await sio.emit("peer_reaction", {
        "sid": sid,
        "user": session.get("full_name"),
        "campus": session.get("campus"),
        "emoji": emoji,
    }, room=room_id, skip_sid=sid)
    print(f"[Backend] reaction: {session.get('full_name')} -> {emoji} in {room_id}")
