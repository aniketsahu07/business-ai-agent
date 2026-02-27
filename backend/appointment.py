# ============================================================
#  Appointment / Lead Manager – Local JSON store
#  (Extendable: swap JSON store with SQLite / Google Calendar)
# ============================================================

import json
import uuid
import os
from datetime import datetime
from typing import Optional, List

DB_PATH = "./data/bookings.json"


def _load() -> list:
    if not os.path.exists(DB_PATH):
        return []
    with open(DB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(records: list):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)


class AppointmentManager:

    def create_booking(
        self,
        name: str,
        phone: str,
        service: str,
        email: Optional[str] = None,
        preferred_time: Optional[str] = None
    ) -> dict:
        records = _load()
        record = {
            "id":             str(uuid.uuid4())[:8].upper(),
            "name":           name,
            "phone":          phone,
            "email":          email or "",
            "service":        service,
            "preferred_time": preferred_time or "To be confirmed",
            "status":         "pending",
            "created_at":     datetime.now().isoformat()
        }
        records.append(record)
        _save(records)
        print(f"📅 New booking: {record['id']} – {name} for {service}")
        return record

    def get_all_bookings(self) -> List[dict]:
        return _load()

    def update_status(self, booking_id: str, status: str) -> Optional[dict]:
        records = _load()
        for r in records:
            if r["id"] == booking_id:
                r["status"] = status
                _save(records)
                return r
        return None

    def delete_booking(self, booking_id: str) -> bool:
        records = _load()
        new_records = [r for r in records if r["id"] != booking_id]
        if len(new_records) == len(records):
            return False
        _save(new_records)
        return True
