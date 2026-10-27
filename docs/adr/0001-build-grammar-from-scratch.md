# ADR-0001: Viết grammar từ đầu thay vì fork

- Trạng thái: Chấp nhận
- Ngày: 2026-10-26

## Bối cảnh

Đã có grammar cộng đồng `alex-pinkus/tree-sitter-swift`, đang được nhiều editor dùng.
Lựa chọn: (A) fork và mở rộng, (B) viết mới từ đầu.

## Quyết định

Chọn (B) — viết mới, dùng grammar hiện có làm tài liệu tham khảo cho các vấn đề khó.

## Lý do

- Kiểm soát hoàn toàn tên node/field và cấu trúc cây theo nhu cầu sản phẩm.
- Hiểu sâu grammar để bảo trì lâu dài.
- Thiết kế từ đầu cho cú pháp Swift 6.x (typed throws, ownership, macro, parameter packs).

## Hệ quả

- Tốn thời gian hơn đáng kể (ước tính theo roadmap M0–M9).
- Tên node không tương thích với query của grammar cộng đồng; editor cần query riêng.
- Nếu ưu tiên thời gian ra mắt thay đổi, xem xét lại phương án (A).
- Tôn trọng license MIT của grammar tham khảo: không sao chép nguyên văn code.
