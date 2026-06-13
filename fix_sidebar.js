const fs = require('fs');
const path = require('path');

const filePath = path.join('g:', 'Dự Án', 'DuAn2026', 'aiguard-web', 'src', 'components', 'layout', 'Sidebar.tsx');

let content = fs.readFileSync(filePath);
// Decode as UTF-8 (but it might contain invalid sequences if interpreted wrong).
// Actually, if it's UTF-8 mojibake, reading as UTF-8 and converting to string might work.
let text = content.toString('utf8');

const replacements = {
    "Tá»•ng quan": "Tổng quan",
    "Báº£o vá»‡ thiáº¿t bá»‹": "Bảo vệ thiết bị",
    "Thiáº¿t bá»‹": "Thiết bị",
    "Nháº\xadt kÃ½ DLP": "Nhật ký DLP",
    "Website AI": "Website AI",
    "Triá»ƒn khai": "Triển khai",
    "Trung tÃ¢m phÃª duyá»‡t": "Trung tâm phê duyệt",
    "Duyá»‡t prompt": "Duyệt prompt",
    "Duyá»‡t hÃ\xa0nh Ä‘á»™ng Agent": "Duyệt hành động Agent",
    "Lá»‹ch sá»\xad phÃª duyá»‡t": "Lịch sử phê duyệt",
    "ChÃ\xadnh sÃ¡ch báº£o máº\xadt": "Chính sách bảo mật",
    "Quy táº¯c phÃ²ng ban": "Quy tắc phòng ban",
    "Bá»™ phÃ¡t hiá»‡n": "Bộ phát hiện",
    "Danh sÃ¡ch tráº¯ng vÃ\xa0 Ä‘en": "Danh sách trắng và đen",
    "PhiÃªn báº£n chÃ\xadnh sÃ¡ch": "Phiên bản chính sách",
    "Kiá»ƒm soÃ¡t AI Agent": "Kiểm soát AI Agent",
    "Danh sÃ¡ch Agent": "Danh sách Agent",
    "Quyá» n sá»\xad dá»¥ng cÃ´ng cá»¥": "Quyền sử dụng công cụ",
    "GiÃ¡m sÃ¡t tool-call": "Giám sát tool-call",
    "Nháº\xadt kÃ½ prompt injection": "Nhật ký prompt injection",
    "MÃ´ phá» ng chÃ\xadnh sÃ¡ch": "Mô phỏng chính sách",
    "Kiá»ƒm toÃ¡n vÃ\xa0 Blockchain": "Kiểm toán và Blockchain",
    "Nháº\xadt kÃ½ kiá»ƒm toÃ¡n": "Nhật ký kiểm toán",
    "LÃ´ neo Blockchain": "Lô neo Blockchain",
    "Quáº£n trá»‹ báº£o máº\xadt": "Quản trị bảo mật",
    "Sá»©c khá» e há»‡ thá»‘ng": "Sức khỏe hệ thống",
    "NgÆ°á» i dÃ¹ng & phÃ²ng ban": "Người dùng & phòng ban",
    "BÃ¡o cÃ¡o cháº·n nháº§m": "Báo cáo chặn nhầm",
    "Quáº£n lÃ½ sá»± cá»‘": "Quản lý sự cố",
    "TrÃ¬nh táº¡o chÃ\xadnh sÃ¡ch": "Trình tạo chính sách",
    "LÆ°u trá»¯ & SIEM": "Lưu trữ & SIEM",
    "Hoáº¡t Ä‘á»™ng cá»§a tÃ´i": "Hoạt động của tôi",
    "Nháº\xadt kÃ½ cÃ¡ nhÃ¢n": "Nhật ký cá nhân",
    "YÃªu cáº§u cá»§a tÃ´i": "Yêu cầu của tôi",
    "NgÆ°á» i dÃ¹ng": "Người dùng",
    "ChÆ°a xÃ¡c Ä‘á»‹nh": "Chưa xác định",
    "Ä Äƒng xuáº¥t": "Đăng xuất"
};

for (const [bad, good] of Object.entries(replacements)) {
    // Escape regex characters just in case, though we don't have any except &
    text = text.split(bad).join(good);
}

// Add Runtime Controls translation as requested since it was untranslated
text = text.replace("{ title: 'Runtime Controls', path: '/app/agents/runtime' }", "{ title: t('Runtime Controls', 'Kiểm soát Runtime'), path: '/app/agents/runtime' }");
text = text.replace("{ title: 'Red-team Tests', path: '/app/agents/red-team' }", "{ title: t('Red-team Tests', 'Kiểm thử Red-team'), path: '/app/agents/red-team' }");

fs.writeFileSync(filePath, text, 'utf8');
console.log('Fixed Sidebar encoding.');
