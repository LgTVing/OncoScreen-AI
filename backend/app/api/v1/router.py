from fastapi import APIRouter

from app.api.v1 import appointments, auth, doctor, encounters, health, navigator, patients, reminders

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(navigator.catalog_router, tags=["catalog"])
api_router.include_router(navigator.router, prefix="/navigator", tags=["navigator"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(encounters.router, prefix="/encounters", tags=["encounters"])
api_router.include_router(doctor.router, prefix="/doctor", tags=["doctor"])
api_router.include_router(reminders.router, prefix="/reminders", tags=["reminders"])
