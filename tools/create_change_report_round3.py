"""Builds the third-round change report for the LegalOne mini program.

Same visual system as the first- and second-round reports so the series reads
as one document set. This round answers the 12 Oct 2026 client review
(微信小程序_12_Oct.pdf, six annotated items).
"""

from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "deliverables"
OUT_DIR.mkdir(exist_ok=True)
OUTPUT = OUT_DIR / "LegalOne小程序第三轮页面修复变更说明.docx"

NAVY = "00558D"
PALE_BLUE = "EDF6FA"
LIGHT_GRAY = "D9D9D9"
TEXT = RGBColor(48, 48, 48)
BLACK = RGBColor(0, 0, 0)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_borders(cell, color=LIGHT_GRAY, size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for name, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn("w:" + name))
        if node is None:
            node = OxmlElement("w:" + name)
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_font(run, latin="Aptos", east_asia="Microsoft YaHei", size=10.5, bold=False, color=TEXT):
    run.font.name = latin
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), east_asia)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color


def style_paragraph(paragraph, space_after=6, line_spacing=1.35):
    paragraph.paragraph_format.space_after = Pt(space_after)
    paragraph.paragraph_format.line_spacing = line_spacing
    for run in paragraph.runs:
        set_font(run)


def add_body(doc, text, bold_lead=None):
    paragraph = doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        lead = paragraph.add_run(bold_lead)
        set_font(lead, bold=True)
        rest = paragraph.add_run(text[len(bold_lead):])
        set_font(rest)
    else:
        run = paragraph.add_run(text)
        set_font(run)
    style_paragraph(paragraph)
    return paragraph


def add_bullet(doc, text, level=0):
    paragraph = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    paragraph.paragraph_format.left_indent = Cm(0.65 + level * 0.45)
    paragraph.paragraph_format.first_line_indent = Cm(-0.25)
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.line_spacing = 1.25
    run = paragraph.add_run(text)
    set_font(run, size=10.2)
    return paragraph


def add_heading(doc, text, level=1):
    paragraph = doc.add_heading(text, level=level)
    paragraph.paragraph_format.keep_with_next = True
    paragraph.paragraph_format.space_before = Pt(14 if level == 1 else 9)
    paragraph.paragraph_format.space_after = Pt(7 if level == 1 else 5)
    paragraph.paragraph_format.line_spacing = 1.1
    for run in paragraph.runs:
        set_font(run, size=15 if level == 1 else 12, bold=True, color=BLACK)
    return paragraph


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def add_table(doc, headers, rows, widths, first_column_centered=True):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.style = "Table Grid"
    header = table.rows[0]
    set_repeat_table_header(header)
    for index, value in enumerate(headers):
        cell = header.cells[index]
        cell.width = widths[index]
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_shading(cell, NAVY)
        set_cell_borders(cell)
        set_cell_margins(cell, top=115, bottom=115)
        paragraph = cell.paragraphs[0]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_after = Pt(0)
        run = paragraph.add_run(value)
        set_font(run, size=9.5, bold=True, color=RGBColor(255, 255, 255))
    for row_index, values in enumerate(rows):
        row = table.add_row()
        prevent_row_split(row)
        for col_index, value in enumerate(values):
            cell = row.cells[col_index]
            cell.width = widths[col_index]
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_borders(cell)
            set_cell_margins(cell)
            if row_index % 2 == 1:
                set_cell_shading(cell, PALE_BLUE)
            paragraph = cell.paragraphs[0]
            centered = first_column_centered and col_index == 0
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if centered else WD_ALIGN_PARAGRAPH.LEFT
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.2
            run = paragraph.add_run(str(value))
            set_font(run, size=9.2)
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(2)
    return table


doc = Document()
section = doc.sections[0]
section.top_margin = Cm(1.9)
section.bottom_margin = Cm(1.8)
section.left_margin = Cm(2.1)
section.right_margin = Cm(2.1)
section.header_distance = Cm(0.8)
section.footer_distance = Cm(0.8)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
normal.font.size = Pt(10.5)
normal.font.color.rgb = TEXT

title_style = styles["Title"]
title_style.font.name = "Aptos Display"
title_style._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), "Microsoft YaHei")
title_style.font.size = Pt(22)
title_style.font.bold = True
title_style.font.color.rgb = BLACK
title_style_ppr = title_style._element.get_or_add_pPr()
title_style_border = title_style_ppr.find(qn("w:pBdr"))
if title_style_border is not None:
    title_style_ppr.remove(title_style_border)

title = doc.add_paragraph(style="Title")
title_ppr = title._p.get_or_add_pPr()
title_border = title_ppr.find(qn("w:pBdr"))
if title_border is not None:
    title_ppr.remove(title_border)
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
title.paragraph_format.space_after = Pt(8)
title.add_run("LegalOne 小程序第三轮页面修复变更说明")

subtitle = doc.add_paragraph()
subtitle.paragraph_format.space_after = Pt(3)
run = subtitle.add_run("项目目录  /Users/yangyongze/Desktop/legalone/legal")
set_font(run, size=9.5, color=BLACK)
version_line = doc.add_paragraph()
version_line.paragraph_format.space_after = Pt(3)
run = version_line.add_run("对应反馈  微信小程序_12_Oct.pdf（客户 2026 年 10 月 12 日走查，共 6 条）")
set_font(run, size=9.5, color=BLACK)
date_line = doc.add_paragraph()
date_line.paragraph_format.space_after = Pt(16)
run = date_line.add_run("整理日期  2026 年 10 月 12 日")
set_font(run, size=9.5, color=BLACK)

add_body(
    doc,
    "本轮修改逐条对应客户 10 月 12 日反馈中的六个问题：公告列表搜索框、文章详情的 "
    "Open in mini program 卡片、web-view 兜底页的技术报错、律所档案缺失的 LegalOne awards "
    "区块、Submit deal/case 的跳转目标，以及验证页的版式（严格对齐官网，含 verified 徽标位置与蓝色面板底色）。六条均按反馈原文执行，"
    "并保持与官网一致的呈现方式。涉及的文件改动共 14 个，"
    "静态检查与接口核对均已通过；示例中引用的字段与链接均已对官网线上接口和线上页面逐一验证。",
)

add_heading(doc, "反馈与处理结果", 1)
feedback_rows = [
    ("1", "公告列表搜索框：可以删除？无法使用",
     "已删除搜索框。核对接口后确认该搜索不可能生效（接口忽略 search 参数）；删除后列表仍按每页 12 条分页加载"),
    ("2", "文章详情：之前提过的问题依然存在，请检查并移除成普通 hyperlink",
     "已移除带边框与箭头的卡片样式和“Open in mini program”标题，改为普通超链接（链接蓝、加下划线、每行一条）"),
    ("3", "出现了不该显示给用家的 error msg",
     "web-view 兜底页不再显示 web-view load failed due to not in domain list 等技术信息，改为一句用户可读的说明；原始报错只写入 console 供支持与测试排查"),
    ("4", "左为官网资料展示，右为微信小程序，微信小程序少显示了必要资料",
     "律所档案补回 LegalOne awards 区块。原因是接口把该数据放在 legalOneAwards 字段，此前只读取了客户提供的 awards 字段"),
    ("5", "5. deal submission page",
     "Submit deal/case 改为打开官网的 /forms/deal-submission（与官网按钮一致），不再跳转到需要登录的会员中心"),
    ("6", "6. verified page style",
     "验证页严格按官网重做：verified 徽标移到白底（不再压在灰底上）、灰卡与 #00558D→#0095DB 渐变面板的底色与间距逐项对齐官网手机版式，并补上缺失的 Law firm 一行"),
]
add_table(doc, ["序号", "客户反馈", "处理结果"], feedback_rows, [Cm(1.1), Cm(5.3), Cm(9.0)], first_column_centered=True)

add_heading(doc, "主要修改内容", 1)

add_heading(doc, "1. 公告列表：删除无法使用的搜索框", 2)
add_body(
    doc,
    "官网公告列表的搜索位于 SORT & FILTER 面板内，小程序此前把它做成了标题下方的独立搜索框。"
    "核对线上接口后确认该搜索不可能生效：/api/crm/announcements/tops 会忽略 Max、Start 与 search "
    "三个参数，任何分页值或关键词都返回同样的 100 条，输入关键词后列表不会有任何变化，"
    "因此按反馈删除该搜索框，公告页与官网一样不再提供独立搜索入口。",
)
add_bullet(doc, "删除标题下方的搜索输入框与放大镜图标，与该输入框绑定的页面事件随之不再使用。")
add_bullet(doc, "接口会一次性返回全部 100 条公告，因此公告列表改为前端分页（每页 12 条）：否则整份列表会一次铺开，"
                "页面上原有的 Learn more 按钮永远不会出现。")
add_bullet(doc, "线上实测：进入公告页显示 12 条并可继续加载，点击 Learn more 后增加到 24 条。")

add_heading(doc, "2. 文章详情的外部链接改为普通超链接", 2)
add_body(
    doc,
    "文章正文里的第三方链接（CFI.co、翻页杂志等）在小程序里无法内嵌渲染，此前会退化成带蓝色边框、"
    "右侧箭头的卡片列表，并带一个“Open in mini program”的标题。本次按反馈把这一块还原为普通超链接。",
)
add_bullet(doc, "删除卡片边框、圆角、内边距、右侧箭头以及“Open in mini program”标题。")
add_bullet(doc, "链接使用官网链接蓝 #0084BA 并加下划线，字号与正文一致（32rpx），每行一条，符合普通超链接的观感。")
add_bullet(doc, "点击行为不变，仍在小程序内打开或提示复制链接（第三方域名无法加入业务域名）。")

add_heading(doc, "3. web-view 兜底页不再显示技术报错", 2)
add_body(
    doc,
    "web-view 失败时页面会把微信返回的原始信息直接显示给用户，例如 web-view load failed due to "
    "not in domain list，同时提示需要配置业务域名——这两句都是给开发者的信息。",
)
add_bullet(doc, "兜底页文案改为一句用户可读的说明：This page cannot be opened inside the mini program. Copy the link and open it in your browser.")
add_bullet(doc, "删除页面上的报错行与业务域名说明；原始报错改为写入 console（[webview] 前缀），便于支持与测试定位。")
add_bullet(doc, "Copy link 与 Retry 两个按钮保持不变，加载超时的兜底逻辑依旧生效。")

add_heading(doc, "4. 律所档案补回 LegalOne awards 区块", 2)
add_body(
    doc,
    "官网律所档案在“执业领域与行业”和“Lawyers' honours list”之间有一个 LegalOne awards 区块，"
    "小程序此前为空。核对线上接口后发现，该区块的数据在 legalOneAwards 字段，而此前的代码只读取了"
    "客户提供的 awards 字段（organization / title / year），因此区块始终不显示。",
)
add_bullet(doc, "接口层新增 legalOneAwards 的字段映射（id、articleId、name、year），并过滤没有名称的记录。")
add_bullet(doc, "律所档案在该位置新增“LegalOne awards”区块：奖项名称为链接蓝并可进入对应文章页，年份另起一行，与官网结构一致。")
add_bullet(doc, "线上实测：JunHe 返回 3 条 LegalOne awards（如 LegalOne Bohai Rim Region Special Awards (China 2025-2026) : Outstanding Full-Service Law Firms，2025），均可跳转到文章。")

add_heading(doc, "5. Submit deal/case 打开官网的提交入口", 2)
add_body(
    doc,
    "Deals/Cases 列表页与 Deal/Case Introduction 页的 Submit deal/case 按钮此前跳转到会员中心，"
    "需要登录才能继续。官网该按钮指向 /forms/deal-submission，这是一个公开入口：填写交易名称、律所名称与"
    "工作邮箱后，系统会发送提交表单的链接。",
)
add_bullet(doc, "两处按钮改为在小程序 web-view 中打开 https://www.legaloneglobal.com/forms/deal-submission（与官网按钮行为一致）。")
add_bullet(doc, "该地址与业务域名同域，已在配置范围内；web-view 无法打开时仍会给出 Copy link 兜底。")

add_heading(doc, "6. 验证页严格按官网重做", 2)
add_body(
    doc,
    "验证页此前是白底描边卡片、整页浅灰、徽标压在灰底上，与官网差异明显。本次按官网样式表逐项重做："
    "以官网在手机宽度下实际生效的规则为准（官网页面宽度小于 600px 时使用 body.mobile600 的样式），"
    "颜色、内外边距、字号、行距均取自官网 style.css 与 mobile.css，并在真机宽度下渲染官网页面读取计算样式后核对。",
)
verify_rows = [
    ("页面底色", "整页 #F2F2F2，徽标与蓝色面板都压在同一块灰底上", "白色页面；只有证书是 #F2F2F2 圆角卡片（圆角 5px、上方间距 20px），与官网 .verification-certificate-outer 一致"),
    ("verified 徽标", "位于灰色背景板上", "移出灰卡、显示在白底之上，宽 200px、上下间距 15px（官网 .verification-certificate-image）"),
    ("蓝色面板", "通栏渐变面板", "保持通栏，渐变严格取官网 .verification-certificate-middle 的 linear-gradient(to bottom right, #00558D, #0095DB)；手机宽度下圆角为 0（官网 mobile.css）"),
    ("面板内间距", "上内边距 30rpx、下 10rpx，无外边距", "官网 .verification-verified-info：外边距 20px 10px、内边距 30px 20px 10px、行距 1.2；标签加粗在上，数值宽 95%、下间距 20px"),
    ("Law firm", "缺失", "补上 Law firm 一行（数据取自接口 lawFirmName，无值时自动隐藏）"),
    ("字体", "系统无衬线体", "证书正文与蓝色面板用衬线体（Noto Serif / Times New Roman），免责声明用 Helvetica 14px，与官网一致"),
    ("字号与行距", "正文 30rpx、行距 1.65，免责声明 24rpx", "正文 34rpx、行距 1.5（官网 16.8px / 25.2px），免责声明 28rpx、行距 1.2（官网 14px / 16.8px）"),
    ("确认与日期区", "浅蓝底盒子、标签在左数值在右", "按官网 .verification-info-description 与 .verification-info-line 去掉底色：标签加粗宽 280px，日期块宽 95%、外边距 10px 0 20px"),
]
add_table(doc, ["项目", "之前", "现在"], verify_rows, [Cm(2.2), Cm(4.6), Cm(8.6)], first_column_centered=False)
add_bullet(doc, "线上实测（参考截图中的 v-1788488697394）：Law firm 显示为 Guantao Law Firm，与官网截图一致。")
add_bullet(doc, "已用与小程序完全相同的一套数值在 WebKit 中复刻该页，并与官网 375 / 390px 的渲染结果并排比对：徽标位置、灰色证书卡、蓝色渐变面板与免责声明的排布一致。")

add_heading(doc, "关键文件", 1)
file_rows = [
    ("公告列表", "pages/announcements/announcements.wxml\npages/announcements/announcements.js", "删除搜索框；公告改为前端每页 12 条"),
    ("文章详情", "pages/article-detail/article-detail.wxml\npages/article-detail/article-detail.wxss", "外部链接改为普通超链接"),
    ("web-view 兜底页", "pages/webview/webview.js\npages/webview/webview.wxml\npages/webview/webview.wxss", "不再显示技术报错"),
    ("律所档案", "services/api.js\npages/lawfirm-detail/lawfirm-detail.js\npages/lawfirm-detail/lawfirm-detail.wxml", "新增 legalOneAwards 字段与 LegalOne awards 区块"),
    ("交易提交入口", "pages/deals/deals.js\npages/deal-case-intro/deal-case-intro.js", "打开官网 deal submission 表单"),
    ("验证页", "pages/verification-detail/verification-detail.js\npages/verification-detail/verification-detail.wxml\npages/verification-detail/verification-detail.wxss", "严格按官网重做版式（徽标、灰卡、渐变面板）与 Law firm 行"),
]
add_table(doc, ["范围", "文件", "用途"], file_rows, [Cm(2.6), Cm(7.0), Cm(5.8)], first_column_centered=False)

add_heading(doc, "验证结果", 1)
validation_rows = [
    ("JavaScript 语法", "通过", "services/api.js 与涉及的 6 个页面脚本均通过 node --check"),
    ("公告列表", "通过", "以线上接口运行页面逻辑：首页 12 条、hasMore 为真，点击 Learn more 后增加到 24 条；搜索框已移除"),
    ("律所奖项字段", "通过", "以线上接口核对 JunHe：legalOneAwards 3 条，字段与跳转文章 id 完整"),
    ("验证页字段", "通过", "以截图中的 v-1788488697394 运行页面逻辑，Law firm 输出 Guantao Law Firm"),
    ("验证页版式", "通过", "在 WebKit 中以 375 / 390px 渲染官网验证页读取计算样式，再用同一套数值复刻小程序页面并排比对，徽标位置、灰卡与渐变面板一致"),
    ("提交入口", "通过", "两处按钮均生成 /pages/webview/webview?url=https%3A%2F%2Fwww.legaloneglobal.com%2Fforms%2Fdeal-submission"),
    ("模板与样式", "通过", "涉及的 WXML 标签配对、WXSS 花括号配对检查通过，无悬空样式类"),
    ("微信真机预览", "待完成", "需要在具备该 AppID 开发者权限的微信账号下生成预览二维码后复核"),
]
add_table(doc, ["检查项", "状态", "说明"], validation_rows, [Cm(3.0), Cm(2.2), Cm(10.2)], first_column_centered=False)

add_heading(doc, "上线前检查", 1)
add_bullet(doc, "公告列表：确认搜索框已不再出现，列表首屏 12 条、Learn more 可继续加载，加载完毕后显示 No more results。")
add_bullet(doc, "文章详情：确认第三方链接显示为蓝色下划线超链接，点击后可打开或提示复制链接。")
add_bullet(doc, "web-view：在业务域名未配置或页面无法打开时，确认页面上只出现用户可读说明，没有技术报错。")
add_bullet(doc, "律所档案：抽查带 LegalOne awards 的律所（如 JunHe、King & Wood），确认区块位置在执业领域与荣誉榜之间，链接可进入文章。")
add_bullet(doc, "交易提交：从 Deals/Cases 与 Deal/Case Introduction 两处点击 Submit deal/case，确认打开官网 /forms/deal-submission 表单。")
add_bullet(doc, "验证页：抽查若干条验证记录，确认 verified 徽标位于白色页面上（不在灰色证书卡内）、灰色证书卡与蓝色渐变面板的底色和间距与官网一致，Law firm 一行显示正常。")

add_heading(doc, "当前状态", 1)
add_body(
    doc,
    "六条反馈对应的代码修改已完成，静态检查、线上接口字段核对与页面逻辑实测全部通过。"
    "剩余工作是在微信开发者工具与真机上完成视觉复核。",
)

footer = section.footer
footer_paragraph = footer.paragraphs[0]
footer_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer_run = footer_paragraph.add_run("LegalOne 小程序第三轮页面修复变更说明")
set_font(footer_run, size=8.5, color=RGBColor(120, 120, 120))

doc.core_properties.title = "LegalOne 小程序第三轮页面修复变更说明"
doc.core_properties.subject = "微信小程序 10 月 12 日客户反馈（六条）的修改记录"
doc.core_properties.author = "LegalOne 项目组"
doc.core_properties.keywords = "LegalOne 微信小程序 变更说明 第三轮"
doc.save(OUTPUT)
print(OUTPUT)
