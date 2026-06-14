using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace aiguard_api.Hubs;

/// <summary>
/// SignalR Hub for real-time notifications.
/// Events:
/// - NewApprovalRequest: Sent when a new approval request is created
/// - ApprovalDecided: Sent when an approval is approved/rejected
/// - EmergencyAlert: Sent for Critical-level security events
/// - PolicyUpdated: Sent when a policy is modified
/// </summary>
[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var allowedGroups = GetAllowedGroups();
        foreach (var group in allowedGroups)
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = Context.ConnectionId,
            message = "Connected to AIGuard Notification Hub",
            groups = allowedGroups
        });
        await base.OnConnectedAsync();
    }

    /// <summary>Join a notification group (e.g., by department or role)</summary>
    public async Task JoinGroup(string groupName)
    {
        if (!GetAllowedGroups().Contains(groupName, StringComparer.OrdinalIgnoreCase))
            throw new HubException("The requested notification group is outside your authorization scope.");
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("GroupJoined", groupName);
    }

    /// <summary>Leave a notification group</summary>
    public async Task LeaveGroup(string groupName)
    {
        if (!GetAllowedGroups().Contains(groupName, StringComparer.OrdinalIgnoreCase))
            throw new HubException("The requested notification group is outside your authorization scope.");
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }

    private List<string> GetAllowedGroups()
    {
        var tenant = Context.User?.FindFirstValue("tenantCode");
        if (string.IsNullOrWhiteSpace(tenant)) return [];
        var groups = new List<string> { NotificationGroups.Tenant(tenant) };
        var role = Context.User?.FindFirstValue(ClaimTypes.Role) ?? Context.User?.FindFirstValue("role");
        var email = Context.User?.FindFirstValue(ClaimTypes.Email) ?? Context.User?.FindFirstValue("email");
        var department = Context.User?.FindFirstValue("departmentId");
        if (!string.IsNullOrWhiteSpace(role)) groups.Add(NotificationGroups.Role(tenant, role));
        if (!string.IsNullOrWhiteSpace(email)) groups.Add(NotificationGroups.User(tenant, email));
        if (Guid.TryParse(department, out var departmentId))
            groups.Add(NotificationGroups.Department(tenant, departmentId));
        return groups;
    }
}
