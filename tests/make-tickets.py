# make-tickets.py  ->  MADE-UP ServiceNow-style exports for the tests  (no real person,  ticket or team in them).
#
#   py -3.12 -I make-tickets.py <folder> [rows]          (rows: 25000 by default)
#
# Writes into <folder>:
#   incident.csv          30 columns like a ServiceNow incident export  (some always empty,  some long multi-line text)
#   change_request.csv    a small second file  (the tests open it to check that results reset on a new file)
#   expected.json         the TRUE answers,  counted here in Python  (the Checks test compares the app with these)
#
# Planted on purpose:
#   - one team  (SD-L1-NORTH)  with 52 open tickets:  the only one over 40
#   - encoding scars  (â€“  Â  Ã)  in some text fields,  and lowercase  ã  ("São Paulo")  decoys that LIKE must NOT count
#   - exactly 3 "P1 - Critical" tickets
#   - "network" in many rows,  sometimes twice in one row  (the snap menu's "hit 1 of 2")
import csv, json, os, random, sys

out = sys.argv[1]
rows = int(sys.argv[2]) if len(sys.argv) > 2 else 25000
os.makedirs(out, exist_ok=True)
rnd = random.Random(21)

COLS = ['Number', 'Created', 'Short description', 'Description', 'Affected user', 'Assignment group', 'Assigned to',
        'Problem', 'State', 'Parent Incident', 'Priority', 'Impact', 'Urgency', 'Category', 'Subcategory', 'Updated',
        'Configuration item', 'Contact type', 'Reassignment count', 'Opened by group', 'Location', 'Reopen count',
        'Work notes', 'Close notes', 'Resolved', 'Tags', 'Risk register number', 'On hold reason', 'Knowledge', 'Was P1']
GROUPS = ['SD-L1-NORTH'] + ['SD-L1-SOUTH', 'SD-L2-APPS', 'NET-CORE', 'NET-EDGE', 'CLOUD-WIN', 'CLOUD-LINUX', 'SAP-BASIS',
          'SAP-FIN', 'DB-OPS', 'IAM-ACCESS', 'EUS-DESK', 'EUS-FIELD', 'PRINT-OPS', 'MAIL-OPS', 'SEC-OPS', 'BI-REPORTS',
          'HR-APPS', 'PLANT-OT', 'VOICE-OPS']
OPEN = ['New', 'In Progress', 'On Hold']
SUBJECTS = ['Network drop in building {n}', 'Password reset for user {n}', 'Printer jam on floor {n}', 'Laptop will not boot',
            'VPN keeps disconnecting', 'Shared drive is slow', 'Report fails to load', 'Email stuck in outbox',
            'Badge reader offline at gate {n}', 'Network switch alarm on rack {n}']

# which rows are open,  per team:  52 for SD-L1-NORTH,  25 for every other team
open_rows = {}
order = list(range(rows))
rnd.shuffle(order)
k = 0
for g in GROUPS:
    for _ in range(52 if g == 'SD-L1-NORTH' else 25):
        open_rows[order[k]] = g
        k += 1
p1_rows = set(order[k:k + 3])

lines = []
for i in range(rows):
    n = 1900000 + i
    group = open_rows.get(i, GROUPS[rnd.randrange(len(GROUPS))])
    state = rnd.choice(OPEN) if i in open_rows else rnd.choice(['Closed'] * 7 + ['Resolved'] * 2 + ['Canceled'])
    subject = rnd.choice(SUBJECTS).format(n=rnd.randrange(1, 40))
    desc = 'Caller reported: ' + subject.lower() + '.\nSteps tried: restart, check cables.\nUser ID: U' + str(rnd.randrange(10000, 99999))
    if 'network' in subject.lower() and rnd.random() < 0.5:
        desc += '\nNetwork team was paged.'
    r = rnd.random()
    if r < 0.03:
        desc = 'Contact e-mail:Â  Â xxx\n' + desc                 # a scar  (Â)
    elif r < 0.05:
        desc = desc + '\nUpdate â€“ waiting on vendor'             # a scar  (â€)
    elif r < 0.06:
        desc = desc + '\nOffice: São Paulo'                       # NOT a scar:  lowercase ã
    elif r < 0.065:
        desc = desc + '\nArea: ÃREA 7'                            # a scar  (Ã,  uppercase)
    work = '' if rnd.random() < 0.4 else '2026-09-01 10:00:00 - xxx (Work notes)\nChecked the device.'
    closed = state in ('Closed', 'Resolved')
    prio = 'P1 - Critical' if i in p1_rows else rnd.choice(['P3 - Average'] * 6 + ['P4 - Low'] * 3 + ['P2 - High'])
    lines.append({
        'Number': 'INC%07d' % n, 'Created': '2026-%02d-%02d %02d:%02d:00' % (rnd.randrange(7, 10), rnd.randrange(1, 29), rnd.randrange(24), rnd.randrange(60)),
        'Short description': subject, 'Description': desc, 'Affected user': 'User %04d' % rnd.randrange(1, 3000),
        'Assignment group': group, 'Assigned to': 'Agent %03d' % rnd.randrange(1, 400), 'Problem': '', 'State': state,
        'Parent Incident': '', 'Priority': prio, 'Impact': rnd.choice(['2 - Medium', '3 - Low', '4 - User']),
        'Urgency': rnd.choice(['2 - Medium', '3 - Low']), 'Category': rnd.choice(['Network', 'Software', 'Hardware', 'Security']),
        'Subcategory': rnd.choice(['Access', 'Performance', 'Failure', '']), 'Updated': '2026-09-02 08:00:00',
        'Configuration item': 'CI-%05d' % rnd.randrange(1, 9000), 'Contact type': rnd.choice(['Phone', 'Self-service', 'Event']),
        'Reassignment count': str(rnd.randrange(0, 4)), 'Opened by group': rnd.choice(GROUPS), 'Location': 'Plant %d' % rnd.randrange(1, 12),
        'Reopen count': '0', 'Work notes': work, 'Close notes': 'Fixed and confirmed with the caller.' if closed else '',
        'Resolved': '2026-09-03 09:00:00' if closed else '', 'Tags': '', 'Risk register number': '',
        'On hold reason': 'Awaiting Caller' if state == 'On Hold' else '', 'Knowledge': rnd.choice(['true', 'false']), 'Was P1': 'false',
    })

with open(os.path.join(out, 'incident.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(lines)

with open(os.path.join(out, 'change_request.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['Number', 'State', 'Short description', 'Assignment group'])
    for i in range(500):
        w.writerow(['CHG%07d' % (300000 + i), rnd.choice(['Closed', 'Scheduled', 'New']), 'Patch window %d' % i, rnd.choice(GROUPS)])

# THE TRUE ANSWERS  (the same rules the suggested checks use)
marks = ('â€', 'Ã', 'Â')
scar_cols = ['Short description', 'Description', 'Work notes', 'Close notes']
open_by = {}
for r in lines:
    if r['State'] not in ('Closed', 'Resolved', 'Canceled', 'Cancelled') and r['State'] != '':
        open_by[r['Assignment group']] = open_by.get(r['Assignment group'], 0) + 1
over = sorted([[g, c] for g, c in open_by.items() if c > 40])
expected = {
    'rows': len(lines),
    'blankNumbers': sum(1 for r in lines if r['Number'] == ''),
    'duplicateNumbers': len(lines) - len(set(r['Number'] for r in lines)),
    'groupsOver40Open': over,
    'scarredRows': sum(1 for r in lines if any(any(m in r[c] for m in marks) for c in scar_cols)),
    'p1': sum(1 for r in lines if r['Priority'] == 'P1 - Critical'),
}
with open(os.path.join(out, 'expected.json'), 'w', encoding='utf-8') as f:
    json.dump(expected, f, indent=2)
print(json.dumps(expected))
