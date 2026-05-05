# -*- coding: utf-8 -*-
"""Генерирует CSV для листа «Объезды» v2 (совпадает с appscript DETOURS_HEADERS)."""
import csv
from datetime import datetime, timedelta

HEADERS = [
    "id",
    "createdAt",
    "restaurant",
    "director",
    "employeeName",
    "employeeInn",
    "paperReason",
    "plannedVisitDate",
    "status",
    "adminDeadline",
    "adminComment",
    "contractDeliveryDate",
    "updatedAt",
]


def map_legacy(code):
    """Ваши коды → статусы в панели."""
    s = str(code).strip().lower()
    if s == "2":
        return "Доставлено"
    if s == "1" or s == "1?":
        return "Доставлено*"
    if s == "0":
        return "Новая"
    if "уехал" in s:
        return "Отменено"
    return "В работе"


def fmt_ru(dt):
    return dt.strftime("%d.%m.%Y")


def main():
    src = "obyezdy_migracija_source.tsv"
    out_path = "obyezdy_migracija_google.csv"
    base = datetime(2026, 3, 15)

    with open(src, encoding="utf-8") as f:
        rows = list(csv.reader(f, delimiter="\t"))

    with open(out_path, "w", encoding="utf-8", newline="") as out:
        w = csv.writer(out)
        w.writerow(HEADERS)
        n = 0
        for row in rows[1:]:
            if len(row) < 4:
                continue
            restaurant, fio, metro, legacy = row[0], row[1], row[2], row[3]
            inn = row[4].strip() if len(row) > 4 else ""
            metro = (metro or "").strip()
            status = map_legacy(legacy)
            n += 1
            rid = f"M{n}"
            created = fmt_ru(base + timedelta(days=n))
            planned = fmt_ru(base + timedelta(days=5 + (n % 20)))
            dl = "" if status in ("Доставлено", "Отменено", "Доставлено*") else fmt_ru(base + timedelta(days=40))
            paper = f"Метро: {metro}" if metro else "Миграция из списка учёта"
            comment = f"Импорт из ручного списка; код учёта: {legacy.strip()}"
            w.writerow(
                [
                    rid,
                    created,
                    restaurant,
                    "Импорт (список)",
                    fio,
                    inn,
                    paper,
                    planned,
                    status,
                    dl,
                    comment,
                    "",
                    created,
                ]
            )

    print("Written", out_path, "rows", n)


if __name__ == "__main__":
    main()
