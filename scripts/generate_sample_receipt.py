import os
from PIL import Image, ImageDraw, ImageFont

def generate():
    width, height = 800, 1150
    img = Image.new("RGB", (width, height), color="#F3F4F6")
    draw = ImageDraw.Draw(img)

    FONT_PATH = "C:/Windows/Fonts/malgun.ttf"
    FONT_BOLD_PATH = "C:/Windows/Fonts/malgunbd.ttf"

    font_title = ImageFont.truetype(FONT_BOLD_PATH, 30)
    font_amount = ImageFont.truetype(FONT_BOLD_PATH, 46)
    font_amount_label = ImageFont.truetype(FONT_PATH, 16)
    font_label = ImageFont.truetype(FONT_PATH, 20)
    font_val = ImageFont.truetype(FONT_BOLD_PATH, 20)
    font_tag = ImageFont.truetype(FONT_BOLD_PATH, 14)
    font_footer = ImageFont.truetype(FONT_PATH, 14)

    card_x0, card_y0 = 60, 45
    card_x1, card_y1 = width - 60, height - 45
    radius = 24

    # Card Background
    draw.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=radius, fill="#FFFFFF", outline="#E5E7EB", width=2)

    # Top Accent Bar
    draw.rounded_rectangle([card_x0, card_y0, card_x1, card_y0 + 10], radius=5, fill="#0F62FE")

    # Header Badge: [신한 SOL페이 | 카드 승인전표]
    draw.rounded_rectangle([card_x0 + 40, card_y0 + 35, card_x0 + 40 + 250, card_y0 + 72], radius=8, fill="#EDF5FF")
    draw.text((card_x0 + 55, card_y0 + 44), "신한 SOL페이  |  승인전표", fill="#0F62FE", font=font_tag)

    # Status
    draw.text((card_x1 - 135, card_y0 + 44), "● 정상승인", fill="#10B981", font=font_tag)

    # Title
    draw.text((card_x0 + 40, card_y0 + 95), "신용카드 이용 영수증", fill="#111827", font=font_title)

    # Amount Box
    box_y0 = card_y0 + 150
    box_y1 = box_y0 + 125
    draw.rounded_rectangle([card_x0 + 40, box_y0, card_x1 - 40, box_y1], radius=16, fill="#F8FAFC", outline="#E2E8F0", width=1)

    draw.text((card_x0 + 65, box_y0 + 20), "결제 금액 (합계)", fill="#64748B", font=font_amount_label)
    draw.text((card_x0 + 65, box_y0 + 52), "17,000", fill="#0F172A", font=font_amount)
    draw.text((card_x0 + 230, box_y0 + 68), "원", fill="#0F172A", font=font_title)

    # Dashed separator line
    dash_y = box_y1 + 40
    dash_x = card_x0 + 40
    while dash_x < card_x1 - 40:
        draw.line([(dash_x, dash_y), (dash_x + 8, dash_y)], fill="#CBD5E1", width=2)
        dash_x += 16

    # Table rows
    fields = [
        ("가맹점명", "NETFLIX (넷플릭스)"),
        ("상품명", "넷플릭스 프리미엄 (월간 멤버십)"),
        ("결제 금액", "17,000원"),
        ("결제일시", "2026-09-09 14:20:15"),
        ("다음 결제일", "2026-10-09 (정기 결제 예정)"),
        ("결제 수단", "신한카드 1234"),
        ("결제 구분", "매월 정기결제 (일시불)"),
        ("승인 번호", "83921045"),
        ("가맹점 번호", "720-86-00432"),
    ]

    cur_y = dash_y + 35
    row_height = 50

    for label, val in fields:
        draw.text((card_x0 + 45, cur_y), label, fill="#64748B", font=font_label)
        draw.text((card_x0 + 225, cur_y), val, fill="#1E293B", font=font_val)
        cur_y += row_height

    # Bottom dashed line
    dash_y2 = cur_y + 15
    dash_x = card_x0 + 40
    while dash_x < card_x1 - 40:
        draw.line([(dash_x, dash_y2), (dash_x + 8, dash_y2)], fill="#E2E8F0", width=1)
        dash_x += 16

    # Footer info
    footer_text = "• 본 영수증은 SubMate 결제 인식(OCR) 테스트용 표준 레퍼런스 이미지입니다.\n• 부가가치세법 제32조의2 규정에 의한 신용카드 매출전표입니다."
    draw.text((card_x0 + 45, dash_y2 + 25), footer_text, fill="#94A3B8", font=font_footer, spacing=8)

    output_path = "D:/SubMate/public/sample_receipt_netflix.png"
    img.save(output_path, "PNG", quality=95)
    print("Generated successfully at:", output_path)

if __name__ == "__main__":
    generate()
