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
     "已按官网重做：正文改为原生块渲染（段落 / 列表 / 正文图片 / 居中的 - END -），正文里的链接回到句子中且不带下划线；原来标题下的链接清单仅作为兜底保留"),
    ("3", "出现了不该显示给用家的 error msg",
     "web-view 兜底页不再显示 web-view load failed due to not in domain list 等技术信息，改为一句用户可读的说明；原始报错只写入 console 供支持与测试排查"),
    ("4", "左为官网资料展示，右为微信小程序，微信小程序少显示了必要资料",
     "律所档案补回 LegalOne awards 区块。原因是接口把该数据放在 legalOneAwards 字段，此前只读取了客户提供的 awards 字段"),
    ("5", "5. deal submission page",
     "Submit deal/case 改为打开官网的 /forms/deal-submission（与官网按钮一致），不再跳转到需要登录的会员中心"),
    ("6", "6. verified page style",
     "验证页严格按官网重做：verified 徽标移到白底（不再压在灰底上）、灰卡与 #00558D→#0095DB 渐变面板的底色与间距逐项对齐官网手机版式，并补上缺失的 Law firm 一行"),
    ("7", "律所档案少了 Head office",
     "按官网 displayHeadOffice 的逻辑补上 Head office 一行（城市 / 国家，链接到该办公室），无标记的律所不显示该行；计数区块的排布与配色（蓝标题、加粗数值、竖线与首行分隔线）一并对齐官网"),
    ("8", "跳转时经常先出现只有页脚的页面",
     "page 改为撑满一屏的纵向 flex 容器、页脚 margin-top:auto：加载期间页脚固定在屏幕底部，而不是顶到页头下面；与官网短页面（/sign_in）的页脚定位一致"),
    ("8.1", "数据页需要加载中占位",
     "共用 .page-loading（撑满一屏、居中 Loading...，页脚落在首屏外）套用到 12 个已有 Loading 文案的页面；"
     "6 个列表页增加首屏加载行；文章与交易详情页补上 loading / unavailable 状态"),
    ("9", "文章正文图片被裁切",
     "正文图片与浏览器一样按栏宽封顶：超过栏宽的信息图等比缩放到栏宽，小于栏宽的徽章 / 分隔条保留原尺寸；旧 Blob 域图片地址改写为官网 CDN"),
    ("10", "点击 E-form 后页面一直闪",
     "定位为官网会员页的相对地址跳转循环；小程序侧加装防循环保护（8 秒内 3 次重载即停并给出提示与 Copy link）；"
     "并给出官网侧一行修法建议"),
    ("11", "奖项卡片文字跑到图片外面",
     "获奖人卡片在 awardContent 与文章正文两种存放位置改为复用同一套解析与卡片模板；卡片字段分行显示；"
     "旧模板的 ../../ 相对路径归一化，Click for profile 可正确跳转"),
    ("12", "文章正文显示成 HTML 源码",
     "正文解析器改为忽略所有不认识的包装标签（Word 粘贴的 div / p 包装不再泄漏为文字）；抽查 400 篇正文无泄漏"),
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

add_heading(doc, "2. 文章详情：正文按官网渲染，链接回到正文里", 2)
add_body(
    doc,
    "文章正文此前整段交给 <rich-text> 渲染，而这篇报道的 CMS 正文有 1.4 MB（内嵌两张 base64 图片），"
    "远超 setData 的 1 MB 限制，正文实际渲染不出来；正文里的第三方链接因此退化成标题下方的链接清单。"
    "本次把正文改成原生块渲染：段落、列表、正文图片与居中的“- END -”都按官网结构逐块显示，"
    "链接回到它原本所在的句子里，与官网一致。",
)
add_bullet(doc, "新增 services/article-body.js：把 CMS HTML 解析成原生块（段落 / 列表 / 图片），段落内保留粗体、"
                "斜体与链接（链接按 URL 匹配回 externalLinks，点击行为不变）。")
add_bullet(doc, "段落样式取自官网：Helvetica 16.896px / 行距 20.2752px、颜色 #2D2D2D、段间距 25.34px、字距 0.6px；"
                "列表文字缩进 22.17px；链接为官网链接蓝 #0084BA 且不加下划线（官网本来就不带下划线）。")
add_bullet(doc, "正文里的 base64 图片由新的 services/inline-images.js 写入小程序本地用户目录，再用 <image> 显示，"
                "并按 CMS 标注的尺寸（100×100）与官网一样并排显示；该报道的页面 data 由约 1.4 MB 降到约 7 KB。")
add_bullet(doc, "只有正文无法安全转换的内容（联赛表格、翻页书、<picture>）与奖项长名单仍走原来的 rich-text 路径，"
                "保证 Deals of the Year、Elite 100 等页面不受影响。")
add_bullet(doc, "顺带对齐官网的细节：标签在左、编号在右（官网 .list-label 与 .reference 的排布），标题 29.568px、行距 1.0。")
add_bullet(doc, "链接点击后的行为不变：同域页面在小程序内打开，第三方域名提示复制链接到浏览器。")

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

add_heading(doc, "7. 律所档案补上 Head office", 2)
add_body(
    doc,
    "客户指出律所档案（Grandway Law Offices）少了官网的 Head office 一行。核对官网模板后确认："
    "官网用 displayHeadOffice 助手取 lawFirmOffices 中 headOffice 为 true 的办公室，"
    "输出“Head office”标题、城市与国家，并链接到该办公室的档案页；没有任何办公室标记时该行不显示"
    "（例如 Davis Polk、One Asia Lawyers）。小程序此前只渲染了 Offices / Partners / Lawyers 三个计数。",
)
add_bullet(doc, "接口层在 office 列表上保留 headOffice 标记，并输出 headOffice（id、name、city、location）；"
                "仅当存在被标记的办公室时才有值，与官网的判断完全一致。")
add_bullet(doc, "律所档案的计数区块改为官网的两列两行：Head office（如“Beijing, China”）与 Offices 一行，"
                "Partners 与 Lawyers 一行；点击 Head office 进入该办公室档案页（复用原有的 goOffice 跳转）。")
add_bullet(doc, "计数区块的版式一并对齐官网 .lawfirm-info：格子宽 45%、列间距 3px、行间距 30px；标题为官网链接蓝 #0084BA、字号 19.008px、加粗、下方 5px；数值 14.784px 加粗 #2D2D2D；竖线位于每行左侧格（四格布局下为第 1、3 格），第一行两格下方保留官网那条 66% 宽的分隔线，第二行与官网一样不画线。")
add_bullet(doc, "线上实测：Grandway headOffice 输出“Beijing, China”（办公室 id 与官网链接一致）；"
                "无标记的律所（Davis Polk、One Asia Lawyers）不显示该行，与官网一致。")

add_heading(doc, "8. 跳转时先出现的“只有页脚”的页面", 2)
add_body(
    doc,
    "客户反馈：点击跳转时经常先出现一个只有页脚的页面。原因是数据页在等接口返回时，页面里只有页头与页脚"
    "（正文是 wx:if，数据没到就不渲染），块级布局下页脚会直接贴在页头下面，看起来就是一整块页脚加下方空白。",
)
add_bullet(doc, "app.wxss 让 page 成为撑满一屏的纵向 flex 容器，页脚加上 margin-top:auto：数据未到时页脚固定在屏幕底部，"
                "内容到达后自然把页脚推到正文之后，任何页面都不会再让页脚顶到页头下面。")
add_bullet(doc, "这与官网一致：实测官网短页面（/sign_in）的页面高度等于视口高度、页脚贴在视口底部，"
                "即官网本身就是把页脚固定在底部的。")
add_bullet(doc, "另外核对发现官网的验证详情页没有页脚（实测该页没有 ISO / ISSN / 页脚元素，正文以免责声明结束），"
                "小程序验证页也去掉了页脚，与该页保持一致。")

add_heading(doc, "8.1 数据页的“加载中”占位", 2)
add_body(
    doc,
    "按贵方要求，数据页在等待接口期间显示加载中占位，而不是空白页面。",
)
add_bullet(doc, "新增共用样式 .page-loading：撑满一屏、垂直居中显示 Loading...，页脚因此落在首屏之外；"
                "已有 Loading 文案的 12 个页面（账号、公告详情、切换 sector、仪表盘、表单下载、律所档案、办公室、律师档案、"
                "资料编辑、验证页等）直接套用该样式。")
add_bullet(doc, "列表页（公告 / 文章 / 奖项 / 交易 / 律所 / 亮点）新增首屏加载行 .list-loading，"
                "在首批结果返回前于列表区域显示 Loading...，不会再出现空白列表。")
add_bullet(doc, "文章详情与交易详情此前没有任何加载状态，本次补上 loading / unavailable 两种状态："
                "加载中显示 Loading...，取不到数据时显示“暂时无法显示”，不再是不明所以的空白页。")
add_bullet(doc, "以 375×812 复刻确认：加载期间只显示页头与居中的 Loading...，页脚被推到首屏之外；数据到达后恢复正常布局。")

add_heading(doc, "9. 文章正文图片被右侧裁切", 2)
add_body(
    doc,
    "客户反馈：正文里的图有问题（Humanoid robotics 一文的信息图右侧被切掉）。原因是 CMS 在图片标签上标了像素尺寸"
    "（两张信息图为 width/height=500），小程序按标注尺寸固定渲染成 1000rpx（约 520px），超过屏宽后被裁切；"
    "官网把正文图片当普通 <img> 处理，浏览器按 max-width:100% 缩放到栏宽——实测 500px 的图在官网渲染为 337.5px 的正方形。",
)
add_bullet(doc, "正文图片改为与浏览器一致：不超过栏宽（339px）的图片保留 CMS 标注尺寸（例如 100×100 的奖项徽章、291×36 的分隔条），"
                "超过栏宽的图片按栏宽等比显示（width:100% + widthFix），不再裁切。")
add_bullet(doc, "CMS 中指向旧 Blob 域（storelegaloneprod.blob.core.windows.net）的图片地址改为官网 CDN，"
                "与 rich-text 共用同一套 URL 规则，否则小程序侧无法下载该图。")
add_bullet(doc, "线上核对 Humanoid robotics 一文：27 个正文块，两张信息图改为整栏宽显示，291×36 分隔条保留原尺寸，"
                "base64 图片仍写入本地文件后再引用，页面 data 约 15 KB。")

add_heading(doc, "10. 点击 E-form 后页面一直闪", 2)
add_body(
    doc,
    "客户反馈：在会员中心 Upcoming schedule 里点击 Survey 的 E-form 后，打开的页面一直闪烁。"
    "定位后确认是官网会员页自身的跳转循环：官网的会员权限校验在失败时执行 "
    "window.location.replace(\"./sign_in\")，这是一个相对地址——从 /member_survey/<id> 出发会跳到 "
    "/member_survey/sign_in，而官网路由表里 member_survey/:id 又会把它当成另一个会员页（id 变成 sign_in），"
    "于是再次触发校验、再次 replace 到同一地址，形成整页反复重载，web-view 就一直白屏闪烁。",
)
add_bullet(doc, "小程序侧加装防循环保护：web-view 在 8 秒内连续加载 3 次即判定为自我重载循环，"
                "立刻移除 web-view 并显示兜底面板，闪烁停止。")
add_bullet(doc, "兜底文案针对该情况给出提示：This page keeps reloading inside the mini program: it needs your "
                "LegalOne website login. Copy the link and open it in your browser.，并提供 Copy link 与 Retry。")
add_bullet(doc, "正常的多次跳转（例如一次登录跳转后停住）不会触发：只有 8 秒内 3 次以上才判定；Retry 会清零计数重新尝试。")
add_bullet(doc, "根治需要官网配合改一行：把会员校验失败时的 window.location.replace(\"./sign_in\") 改成绝对地址 "
                "\"/sign_in\"，循环即消失；如需在小程序内直接使用会员 E-form，还需要官网支持从 URL 接收小程序的登录态"
                "（官网会员页目前只读自己的 sessionStorage / localStorage）。")

add_heading(doc, "11. 奖项卡片：文字跑到图片外面", 2)
add_body(
    doc,
    "客户反馈：奖项卡片有的地方文字跑到图片外面（例如 Blue Ribbon 2024 的 CAI Zhenghua 卡片），"
    "并且“类型相同的应采用复用的模式”。定位发现：CMS 把获奖人卡片放在两个字段里——较新的奖项放在独立的 "
    "awardContent，较早的奖项直接放在文章正文 content 里（抽查 172 篇奖项文章：86 篇在 awardContent、"
    "78 篇在正文、0 篇两者都有）。正文里带卡片的文章此前没有走奖项渲染，而是被当成普通正文按段落渲染，"
    "于是卡片底图变成一张普通图片、姓名/律所/城市/联系方式被挤到图片下方，而且同一行的多个字段被连在一起"
    "（如 “Yingke Law FirmShanghai, China”“M: …E: …”）。",
)
add_bullet(doc, "同一类内容改为复用同一套实现：只要检测到正文里带 sa-lawyer 获奖人卡片，就交给与 awardContent "
                "完全相同的 award-content 解析器与同一套卡片模板渲染，卡片底图与文字、Click for profile 按钮、"
                "简介的结构与官网一致。")
add_bullet(doc, "卡片字段按官网分行显示：姓名 / 中文名 / 律所 / 城市 / 联系方式各自独立成行，不再连在一起。")
add_bullet(doc, "顺带修复旧模板的相对路径：卡片里的 ../../images/... 与 ../../profile/lawyers/<id> 会先归一化，"
                "Click for profile 因此能正确指向律师档案并在小程序内跳转（此前地址里带着 ../../，档案 id 也解析不出来）。")
add_bullet(doc, "线上核对：该文 15 张卡片全部解析成功；抽查 86 篇奖项文章，82 篇卡片全部走统一模板、0 篇残留原始卡片标记，"
                "其余 4 篇是不含卡片的联赛表格类文章（仍按原有 rich-text 渲染）。")

add_heading(doc, "12. 文章正文显示成 HTML 源码", 2)
add_body(
    doc,
    "客户反馈：Sullivan & Cromwell 一文正文里直接显示出了 HTML 源码（div class=\"OutlineElement …\" 以及 "
    "style=\"-webkit-user-drag…\" 之类）。原因是这篇正文是从 Word 粘贴的，段落外面套着多层 "
    "<div class=\"OutlineElement\">、<p class=\"Paragraph\"> 这类包装标签；正文解析器只认识段落/列表/图片等少数标签，"
    "遇到不认识的包装标签时把标签内容当成了普通文字，于是属性内容被当成正文显示了出来。",
)
add_bullet(doc, "正文解析器改为忽略所有不认识的标签：只保留段落、列表、图片以及粗体/斜体/链接等行内语义，"
                "其余包装标签（div、section、o:p 等）连同属性一起丢弃。")
add_bullet(doc, "全站核查：文章接口共 208 篇，其中 206 篇走原生正文解析（另 2 篇为表格/图片类，按原 rich-text 渲染）。逐篇用修复前后的解析结果对比，修复前有 6 篇会把标签当正文显示、修复后为 0 篇。这 6 篇分别是：Sullivan & Cromwell strengthens its M&A practice、LegalOne is honoured as “Best ESG Data Provider” at the WatersTechnology Asia Awards 2026、Former Allen & Gledhill partner joins RPC to lead India desk、The impact of USA trade tariffs on businesses、BIP Asia Forum and Entrepreneur Day Returns in December、RCEP special - Indonesia。")

add_heading(doc, "关键文件", 1)
file_rows = [
    ("公告列表", "pages/announcements/announcements.wxml\npages/announcements/announcements.js", "删除搜索框；公告改为前端每页 12 条"),
    ("文章详情", "services/article-body.js\nservices/inline-images.js\npages/article-detail/article-detail.js\npages/article-detail/article-detail.wxml\npages/article-detail/article-detail.wxss", "正文按官网改为原生块渲染，链接内嵌；base64 正文图片落到本地文件"),
    ("页面框架与页脚", "app.wxss\ncomponents/site-footer/site-footer.wxss", "page 改为撑满一屏的 flex 列，页脚固定在底部"),
    ("加载中占位", "app.wxss\npages/*/*.wxml（数据页）", "共用 .page-loading / .list-loading，详情页补 loading / unavailable 状态"),
    ("web-view 防循环", "pages/webview/webview.js\npages/webview/webview.wxml", "8 秒内 3 次重载即判定循环，停止 web-view 并给出登录提示"),
    ("奖项卡片复用", "services/api.js\nservices/award-content.js\nservices/rich-text.js", "正文里的获奖人卡片复用奖项解析与卡片模板；../../ 相对路径归一化"),
    ("正文标签处理", "services/article-body.js", "忽略不认识的包装标签，Word 粘贴的正文不再显示源码"),
    ("web-view 兜底页", "pages/webview/webview.js\npages/webview/webview.wxml\npages/webview/webview.wxss", "不再显示技术报错"),
    ("律所档案", "services/api.js\npages/lawfirm-detail/lawfirm-detail.js\npages/lawfirm-detail/lawfirm-detail.wxml\npages/lawfirm-detail/lawfirm-detail.wxss", "新增 legalOneAwards 区块与 Head office 行（计数区块改为两行四格）"),
    ("交易提交入口", "pages/deals/deals.js\npages/deal-case-intro/deal-case-intro.js", "打开官网 deal submission 表单"),
    ("验证页", "pages/verification-detail/verification-detail.js\npages/verification-detail/verification-detail.wxml\npages/verification-detail/verification-detail.wxss", "严格按官网重做版式（徽标、灰卡、渐变面板）与 Law firm 行"),
]
add_table(doc, ["范围", "文件", "用途"], file_rows, [Cm(2.6), Cm(7.0), Cm(5.8)], first_column_centered=False)

add_heading(doc, "验证结果", 1)
validation_rows = [
    ("JavaScript 语法", "通过", "services/api.js 与涉及的 6 个页面脚本均通过 node --check"),
    ("公告列表", "通过", "以线上接口运行页面逻辑：首页 12 条、hasMore 为真，点击 Learn more 后增加到 24 条；搜索框已移除"),
    ("律所奖项字段", "通过", "以线上接口核对 JunHe：legalOneAwards 3 条，字段与跳转文章 id 完整"),
    ("文章正文转换", "通过", "以 36 篇线上文章核对：全部转为原生块；4 篇奖项长名单仍走 rich-text；示例报道生成 10 个块（含 3 条列表项、2 张图片、5 个正文链接）"),
    ("页面数据体积", "通过", "示例报道（CMS 正文 1.4 MB）的页面 data 由约 1.4 MB 降到约 7 KB，两张 base64 图片写入本地文件后再引用"),
    ("正文标签处理", "通过", "线上抽查 400 篇正文：0 篇出现标签/样式泄漏；示例文解析为 6 段干净正文，页面 data 约 10 KB"),
    ("奖项卡片复用", "通过", "抽查 86 篇线上奖项文章：82 篇卡片全部走统一模板、无原始卡片标记残留；示例文 15 张卡片解析完整，"
        "律所/城市/联系方式分行，profile 链接与图片路径归一化"),
    ("web-view 防循环", "通过", "在 WebKit 中复现官网会员页的跳转链（/member_survey/1 → /member_survey/sign_in，相对地址导致路由回环）；"
        "单元验证 8 秒内 3 次重载触发兜底、分散加载不触发、Retry 清零"),
    ("加载中占位", "通过", "以 375×812 复刻确认加载期间仅显示页头与居中的 Loading...，页脚位于首屏之外；文章 / 交易详情页实测 loading→内容与 unavailable 两条分支"),
    ("页脚定位", "通过", "以 375×812 复刻空内容页确认页脚位于视口底部；并核对官网 /sign_in 同为页脚贴底（页面高度=视口高度）"),
    ("文章图片尺寸", "通过", "线上核对 Humanoid robotics 一文：500px 信息图改为整栏宽，291×36 分隔条保留原尺寸，旧 Blob 地址改写为 CDN"),
    ("律所 Head office", "通过", "线上核对 Grandway：headOffice 输出 Beijing, China 且办公室 id 与官网链接一致；抽查 100 家律所，仅 1 家有计数但无 headOffice 标记，小程序与官网一样不显示该行"),
    ("验证页字段", "通过", "以截图中的 v-1788488697394 运行页面逻辑，Law firm 输出 Guantao Law Firm"),
    ("验证页版式", "通过", "在 WebKit 中以 375 / 390px 渲染官网验证页读取计算样式，再用同一套数值复刻小程序页面并排比对，徽标位置、灰卡与渐变面板一致"),
    ("提交入口", "通过", "两处按钮均生成 /pages/webview/webview?url=https%3A%2F%2Fwww.legaloneglobal.com%2Fforms%2Fdeal-submission"),
    ("模板与样式", "通过", "涉及的 WXML 标签配对、WXSS 花括号配对检查通过，无悬空样式类"),
    ("微信真机预览", "待完成", "需要在具备该 AppID 开发者权限的微信账号下生成预览二维码后复核"),
]
add_table(doc, ["检查项", "状态", "说明"], validation_rows, [Cm(3.0), Cm(2.2), Cm(10.2)], first_column_centered=False)

add_heading(doc, "上线前检查", 1)
add_bullet(doc, "公告列表：确认搜索框已不再出现，列表首屏 12 条、Learn more 可继续加载，加载完毕后显示 No more results。")
add_bullet(doc, "文章详情：确认正文段落、列表与正文图片正常显示，链接位于句子中、为官网链接蓝且不带下划线，点击后可打开或提示复制链接；页面底部为居中的“- END -”。")
add_bullet(doc, "web-view：在业务域名未配置或页面无法打开时，确认页面上只出现用户可读说明，没有技术报错。")
add_bullet(doc, "律所档案：抽查带 LegalOne awards 的律所（如 JunHe、King & Wood），确认区块位置在执业领域与荣誉榜之间，链接可进入文章。")
add_bullet(doc, "交易提交：从 Deals/Cases 与 Deal/Case Introduction 两处点击 Submit deal/case，确认打开官网 /forms/deal-submission 表单。")
add_bullet(doc, "验证页：抽查若干条验证记录，确认 verified 徽标位于白色页面上（不在灰色证书卡内）、灰色证书卡与蓝色渐变面板的底色和间距与官网一致，Law firm 一行显示正常。")
add_bullet(doc, "文章详情：打开 Sullivan & Cromwell 这类正文，确认只显示正常段落，不再出现 div / style 等源码。"),
add_bullet(doc, "奖项文章：打开较早的奖项（如 Blue Ribbon 2024 系列），确认卡片文字压在底图上、律所与城市分行、Click for profile 可进入律师档案。"),
add_bullet(doc, "会员 E-form：在会员中心点击 Survey 的 E-form，确认最多闪一两次后停止并显示提示与 Copy link，不再持续闪烁。"),
add_bullet(doc, "页面跳转：从列表进入任一详情页，确认先看到居中的 Loading...、页脚不在首屏内，加载完成后正常显示内容。")
add_bullet(doc, "文章详情：确认正文中的信息图完整显示、未被右侧裁切，奖项徽章等小图保持原尺寸。")
add_bullet(doc, "律所档案：抽查 Grandway Law Offices，确认 Head office（Beijing, China）为计数区第一格、标题为官网链接蓝、竖线与首行分隔线位置正确，并可进入该办公室档案页；再抽查一家没有 headOffice 标记的律所，确认该行不出现。")

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
