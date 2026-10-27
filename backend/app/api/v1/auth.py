from fastapi import APIRouter, HTTPException, status

from app.api.deps import DB, CurrentUser
from app.models import AuditLog, Consultation
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut
from app.services import auth_service, navigator_service, record_service

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: DB):
    if body.role != "patient":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tài khoản bác sĩ do quản trị viên cấp")
    if auth_service.get_by_email(db, body.email):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email đã tồn tại")
    consult = None
    if body.consultation_id:
        consult = db.get(Consultation, body.consultation_id)
        token_ok = (
            consult is not None
            and body.consultation_token is not None
            and navigator_service.token_matches(consult, body.consultation_token)
        )
        if not token_ok or consult.patient_id is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Phiên tư vấn không hợp lệ hoặc đã được gắn tài khoản")
    user = auth_service.create_user(db, body, commit=False)
    record_service.add_event(
        db,
        user.id,
        "account.created",
        "Tạo tài khoản bệnh nhân" + (" từ phiên tư vấn." if consult else "."),
        actor_id=user.id,
    )
    if consult:
        navigator_service.link(db, consult, user)
    db.add(AuditLog(actor_id=user.id, action="account.register", entity="user", entity_id=user.id))
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: DB):
    user = auth_service.authenticate(db, body.email, body.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sai email hoặc mật khẩu")
    return TokenOut(access_token=auth_service.issue_token(user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user
