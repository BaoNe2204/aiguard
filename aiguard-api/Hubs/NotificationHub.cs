using Microsoft.AspNetCore.SignalR;

namespace aiguard_api.Hubs;

/// <summary>
/// SignalR Hub for real-time notifications.
/// Events:
/// - NewApprovalRequest: Sent when a new approval request is created
/// - ApprovalDecided: Sent when an approval is approved/rejected
/// - EmergencyAlert: Sent for Critical-level security events
/// - PolicyUpdated: Sent when a policy is modified
/// </summary>
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", new
        {
            connectionId = Context.ConnectionId,
            message = "Connected to AIGuard Notification Hub"
        });
        await base.OnConnectedAsync();
    }

    /// <summary>Join a notification group (e.g., by department or role)</summary>
    public async Task JoinGroup(string groupName)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("GroupJoined", groupName);
    }

    /// <summary>Leave a notification group</summary>
    public async Task LeaveGroup(string groupName)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
    }
}
