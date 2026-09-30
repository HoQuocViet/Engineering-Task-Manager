# Engineering Task & Work Manager - Agent Guidelines & Persistent Rules

## Language Requirement
- **Application UI**: All application text, UI components, modals, buttons, forms, tooltips, placeholders, headers, badges, alerts, toast notifications, and chart labels must remain in English.
- **AI Assistant Communication**: Per the user's explicit instruction, the AI Assistant communicates, discusses, and answers questions with the user in **Vietnamese**. Code, file paths, and UI terms referenced in discussions should remain in their original English names for technical clarity.
- All dashboard status breakdowns, project views, package trackers, settings, and engineer profiles in the UI must remain consistently and purely in English.

## Development & Modification Principles (Nguyên tắc lập trình & chỉnh sửa)
- **Chỉ sửa đúng phạm vi yêu cầu (Strict Scope Discipline)**: Chỉ sửa đúng phần logic gây ra lỗi hoặc theo đúng yêu cầu cụ thể của người dùng. Tuyệt đối không thay đổi hay làm ảnh hưởng đến các tính năng khác đang hoạt động đúng.
- **Hỏi lại khi chưa rõ ràng (Clarify Before Coding)**: Đối với bất kỳ ý nào chưa rõ ràng hoặc có thể hiểu theo nhiều cách, bắt buộc phải hỏi lại người dùng trước khi code; tuyệt đối không tự ý hiểu rồi code sai tính năng.
- **Quy trình cập nhật APP_SPECIFICATION.md (Specification Sync & User Confirmation Protocol)**:
  - Khi thực hiện thay đổi tính năng hoặc cấu trúc hệ thống theo yêu cầu của người dùng, KHÔNG được tự ý cập nhật file `APP_SPECIFICATION.md` ngay lập tức.
  - Sau khi hoàn thành code và kiểm tra chạy tốt, trợ lý AI bắt buộc phải hỏi người dùng xem có muốn cập nhật tính năng mới này vào `APP_SPECIFICATION.md` hay không.
  - Nếu code phát sinh lỗi hoặc người dùng không hài lòng, người dùng có quyền yêu cầu revert/quay lại phiên bản trước mà không làm ảnh hưởng đến file đặc tả.
  - Chỉ khi người dùng xác nhận (confirm) đồng ý, trợ lý AI mới tiến hành cập nhật nội dung tương ứng vào `APP_SPECIFICATION.md`.
