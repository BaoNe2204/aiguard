const fs = require('fs');
const path = require('path');

const filePath = path.join('g:', 'Dự Án', 'DuAn2026', 'aiguard-web', 'src', 'components', 'layout', 'Sidebar.tsx');
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// 89 (0-indexed 89 is Line 90): { title: t('Tool Permissions', 'Quyá» n sá»­ dá»¥ng cÃ´ng cá»¥'), path: '/app/agents/permissions' },
lines[89] = "        { title: t('Tool Permissions', 'Quyền sử dụng công cụ'), path: '/app/agents/permissions' },";

// 92 (Line 93): { title: t('Policy Simulation', 'MÃ´ phá» ng chÃ­nh sÃ¡ch'), path: '/app/agents/simulation' },
lines[92] = "        { title: t('Policy Simulation', 'Mô phỏng chính sách'), path: '/app/agents/simulation' },";

// 111 (Line 112): { title: t('System Health', 'Sá»©c khá» e há»‡ thá»‘ng'), path: '/app/governance/health' },
lines[111] = "        { title: t('System Health', 'Sức khỏe hệ thống'), path: '/app/governance/health' },";

// 112 (Line 113): { title: t('Users & Departments', 'NgÆ°á» i dÃ¹ng & phÃ²ng ban'), path: '/app/governance/identity' },
lines[112] = "        { title: t('Users & Departments', 'Người dùng & phòng ban'), path: '/app/governance/identity' },";

// 242 (Line 243): <div className="user-name-brief">{user?.fullName || t('User', 'NgÆ°á» i dÃ¹ng')}</div>
lines[242] = "            <div className=\"user-name-brief\">{user?.fullName || t('User', 'Người dùng')}</div>";

// 249 (Line 250): <button className="logout-btn" onClick={logout} title={t('Sign out', 'Ä Äƒng xuáº¥t')}>
lines[249] = "        <button className=\"logout-btn\" onClick={logout} title={t('Sign out', 'Đăng xuất')}>";

// Check line 245 as well just in case
// 244 (Line 245): {user?.role || t('Unknown', 'ChÆ°a xÃ¡c Ä‘á»‹nh')}
lines[244] = "              {user?.role || t('Unknown', 'Chưa xác định')}";

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Fixed remaining mojibake in Sidebar.tsx');
