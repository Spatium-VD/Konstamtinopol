# -*- coding: utf-8 -*-
"""Генерирует CSV для листа «Объезды» (колонки как в appscript.js)."""
import csv
from datetime import datetime, timedelta

HEADERS = [
    "id",
    "createdAt",
    "restaurant",
    "director",
    "employeeName",
    "employeePhone",
    "employeeInn",
    "contractType",
    "paperReason",
    "plannedVisitDate",
    "desiredDeliveryDate",
    "status",
    "adminDeadline",
    "adminComment",
    "updatedAt",
]


def map_legacy(code):
    """Соответствие ваших кодов учёта статусам в панели."""
    s = str(code).strip().lower()
    if s == "2":
        return "Доставлено"  # всё ок у сотрудника и договор на точке
    if s == "1":
        return "Доставлено в офис"  # бумага в офисе / промежуточно, не финал точки
    if s == "1?":
        return "В работе"  # заказано / в пути, ещё не довезено
    if s == "0":
        return "Новая"
    if "уехал" in s:
        return "Отменено"
    return "В работе"


def main():
    src = "obyezdy_migracija_source.tsv"
    out_path = "obyezdy_migracija_google.csv"
    base = datetime(2026, 3, 15, 9, 0, 0)

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
            rid = f"M{n}"  # префикс M(migration), чтобы не пересечься с живыми D1…
            ca = (base + timedelta(hours=n)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            pv = (base + timedelta(days=5 + (n % 20))).strftime("%Y-%m-%d")
            dd = (base + timedelta(days=12 + (n % 25))).strftime("%Y-%m-%d")
            dl = "" if status in ("Доставлено", "Отменено") else (base + timedelta(days=30)).strftime("%Y-%m-%d")
            paper = f"Метро: {metro}" if metro else "Миграция из списка учёта"
            comment = f"Импорт из ручного списка; код учёта: {legacy.strip()}"
            w.writerow(
                [
                    rid,
                    ca,
                    restaurant,
                    "Импорт (список)",
                    fio,
                    "",
                    inn,
                    "Трудовой",
                    paper,
                    pv,
                    dd,
                    status,
                    dl,
                    comment,
                    ca,
                ]
            )

    print("Written", out_path, "rows", n)


if __name__ == "__main__":
    main()
