import zipfile, sys
ct = '''<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'''
rels = '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'''
wb = '''<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Money" sheetId="1" r:id="rId1"/></sheets></workbook>'''
wbrels = '''<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'''
def s(r, t): return f'<c r="{r}" t="inlineStr"><is><t>{t}</t></is></c>'
def n(r, v): return f'<c r="{r}"><v>{v}</v></c>'
rows = [
 [s('A1','Item'), s('B1','Change'), s('C1','Note')],
 [s('A2','refund'), n('B2','-5'), s('C2','=not a formula')],
 [s('A3','fee'), n('B3','-12.5'), s('C3','+1 555 0100')],
 [s('A4','credit'), n('B4','42'), s('C4','@handle')],
 [s('A5','total'), '<c r="B5"><f>SUM(B2:B4)</f></c>', s('C5','-dash note')],
]
sheet = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ''.join(f'<row r="{i+1}">' + ''.join(r) + '</row>' for i, r in enumerate(rows)) + '</sheetData></worksheet>'
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', ct); z.writestr('_rels/.rels', rels); z.writestr('xl/workbook.xml', wb)
    z.writestr('xl/_rels/workbook.xml.rels', wbrels); z.writestr('xl/worksheets/sheet1.xml', sheet)
