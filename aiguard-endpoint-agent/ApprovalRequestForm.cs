using System.ComponentModel;

namespace AIGuard.EndpointAgent;

public partial class ApprovalRequestForm : Form
{
    private readonly string _appName;
    public string Reason { get; private set; } = string.Empty;

    public ApprovalRequestForm(string appName)
    {
        _appName = appName;
        InitializeComponent();
    }

    private void InitializeComponent()
    {
        this.Text = "AIGuard - Yêu cầu phê duyệt";
        this.Size = new Size(400, 250);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox = false;
        this.MinimizeBox = false;
        this.TopMost = true;

        var lblMsg = new Label
        {
            Text = $"Ứng dụng {_appName} đã bị chặn bởi chính sách bảo mật.\nBạn có muốn gửi yêu cầu xin phép sử dụng không?",
            Location = new Point(20, 20),
            Size = new Size(350, 40)
        };

        var lblReason = new Label
        {
            Text = "Lý do:",
            Location = new Point(20, 70),
            Size = new Size(350, 20)
        };

        var txtReason = new TextBox
        {
            Location = new Point(20, 90),
            Size = new Size(340, 60),
            Multiline = true
        };

        var btnSubmit = new Button
        {
            Text = "Gửi yêu cầu",
            Location = new Point(180, 160),
            Size = new Size(100, 30),
            DialogResult = DialogResult.OK
        };
        btnSubmit.Click += (s, e) => Reason = txtReason.Text;

        var btnCancel = new Button
        {
            Text = "Hủy",
            Location = new Point(290, 160),
            Size = new Size(70, 30),
            DialogResult = DialogResult.Cancel
        };

        this.Controls.Add(lblMsg);
        this.Controls.Add(lblReason);
        this.Controls.Add(txtReason);
        this.Controls.Add(btnSubmit);
        this.Controls.Add(btnCancel);
        this.AcceptButton = btnSubmit;
        this.CancelButton = btnCancel;
    }
}
