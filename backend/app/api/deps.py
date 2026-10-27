"""Dependencies: get_db, get_current_user, get_optional_user, require_role."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

DB = Annotated[Session, Depends(get_db)]


def _user_from_token(token: str, db: Session) -> User | None:
    payload = decode_token(token)
    return db.get(User, payload.get("sub")) if payload else None


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: DB) -> User:
    if not (user := _user_from_token(token, db)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token không hợp lệ")
    return user


def get_optional_user(token: Annotated[str | None, Depends(optional_oauth2_scheme)], db: DB) -> User | None:
    """Endpoint công khai (Navigator): có Bearer hợp lệ thì nhận diện người dùng, không có vẫn cho dùng ẩn danh."""
    if not token:
        return None
    if not (user := _user_from_token(token, db)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token không hợp lệ")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
ConsultToken = Annotated[str | None, Header(alias="X-Consult-Token")]


def require_role(*roles: str) -> Callable[[User], User]:
    def _check(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Không có quyền")
        return user

    return _check


Patient = Annotated[User, Depends(require_role("patient"))]
Doctor = Annotated[User, Depends(require_role("doctor"))]
