# Demo data (made up)

Two fake ServiceNow exports for the vault demo (`roaches/access-and-encryption-handoff.md`, section 5.3).
The IT console packs them: `demo_incident.csv` for **Service Desk**, `demo_change_request.csv` for **Change Team**.

| File | Rows | Shaped like |
|---|---|---|
| `demo_incident.csv` | 2,400 | `incident.csv`: same 44 column names, same order |
| `demo_change_request.csv` | 450 | `change_request.csv`: same 39 column names, same order (except one, below) |

**Every value is invented.** People's names are random first + last name pairs, the teams are generic
("Service Desk L1", "Network Team"), and the IDs are fake (`INC1000000`, `CHG2000000`). State, priority and risk
use ServiceNow's normal words. Nothing came from the Molson files except the column names.

- **Changed column name:** `change_request.csv` has a column header that's a person's name. Here it's `Assigned to`.
- **Dates:** Jul 5 – Sep 1, 2026, written like the real export (`2026-07-05 14:03:22`), so the dashboard's
  "over time" tile works.
- **Like the real thing:** long multi-line Work notes, commas and quotes inside cells, blank cells,
  a few P1s (28) so the P1 bar has something to click.

**Use these for anything shown to a mentor, put in the repo, or shown to an AI.** The real Molson files stay on our own laptops.
