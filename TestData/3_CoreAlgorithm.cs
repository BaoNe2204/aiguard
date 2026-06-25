using System;
using System.Data.SqlClient;

namespace Company.Core
{
    public class PaymentProcessor
    {
        public static void ProcessTransaction()
        {
            // Kết nối vào database nội bộ
            string dbUrl = "Server=tcp:internal-finance-db.company.com,1433;Initial Catalog=FinanceCore;User ID=admin_prod;Password=SuperSecretAdmin123!";
            
            // Gọi API Stripe
            string stripeApiKey = "sk_live_T5xyz1234567890abcdef1234567890abcdef";
            
            Console.WriteLine("Connecting to DB...");
            string query = "SELECT * FROM Users WHERE Role = 'Admin'";
            
            // TODO: Execute query
        }
    }
}
