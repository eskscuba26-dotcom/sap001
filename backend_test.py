import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any

class ERPSystemTester:
    def __init__(self, base_url="https://sap-system.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tokens = {}
        self.test_data = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_user_registration_and_login(self):
        """Test user registration and login for all roles"""
        print("\n🔐 Testing Authentication System...")
        
        # Test users for different roles
        test_users = [
            {"username": "admin", "email": "admin@test.com", "password": "admin123", "role": "admin"},
            {"username": "user1", "email": "user1@test.com", "password": "user123", "role": "user"},
            {"username": "viewer1", "email": "viewer1@test.com", "password": "viewer123", "role": "viewer"}
        ]

        for user_data in test_users:
            # Register user (might fail if already exists, that's ok)
            success, response = self.make_request('POST', 'auth/register', user_data, expected_status=200)
            if not success and "already exists" not in str(response):
                self.log_test(f"Register {user_data['role']} user", False, str(response))
                continue

            # Login user
            login_data = {"username": user_data["username"], "password": user_data["password"]}
            success, response = self.make_request('POST', 'auth/login', login_data)
            
            if success and 'token' in response:
                self.tokens[user_data['role']] = response['token']
                self.test_data[f"{user_data['role']}_user"] = response['user']
                self.log_test(f"Login {user_data['role']} user", True)
                
                # Test /auth/me endpoint
                success, me_response = self.make_request('GET', 'auth/me', token=self.tokens[user_data['role']])
                self.log_test(f"Get current user info for {user_data['role']}", success, str(me_response) if not success else "")
            else:
                self.log_test(f"Login {user_data['role']} user", False, str(response))

    def test_raw_materials_management(self):
        """Test raw materials CRUD operations"""
        print("\n📦 Testing Raw Materials Management...")
        
        if 'admin' not in self.tokens:
            self.log_test("Raw Materials Test", False, "Admin token not available")
            return

        admin_token = self.tokens['admin']
        
        # Create raw material
        material_data = {
            "name": "Test Çelik",
            "code": "STEEL001",
            "unit": "kg",
            "unit_price": 15.50,
            "min_stock_level": 100
        }
        
        success, response = self.make_request('POST', 'raw-materials', material_data, admin_token, 200)
        if success:
            self.test_data['material_id'] = response['id']
            self.log_test("Create raw material", True)
        else:
            self.log_test("Create raw material", False, str(response))
            return

        # Get all raw materials
        success, response = self.make_request('GET', 'raw-materials', token=admin_token)
        self.log_test("Get all raw materials", success, str(response) if not success else "")

        # Get specific raw material
        if 'material_id' in self.test_data:
            success, response = self.make_request('GET', f'raw-materials/{self.test_data["material_id"]}', token=admin_token)
            self.log_test("Get specific raw material", success, str(response) if not success else "")

        # Test viewer access (should work for GET)
        if 'viewer' in self.tokens:
            success, response = self.make_request('GET', 'raw-materials', token=self.tokens['viewer'])
            self.log_test("Viewer can view raw materials", success, str(response) if not success else "")
            
            # Viewer should NOT be able to create
            success, response = self.make_request('POST', 'raw-materials', material_data, self.tokens['viewer'], 403)
            self.log_test("Viewer cannot create raw materials", success, "Viewer was able to create (should be forbidden)")

    def test_stock_transactions(self):
        """Test stock transaction operations"""
        print("\n📊 Testing Stock Transactions...")
        
        if 'admin' not in self.tokens or 'material_id' not in self.test_data:
            self.log_test("Stock Transactions Test", False, "Prerequisites not met")
            return

        admin_token = self.tokens['admin']
        
        # Stock IN transaction
        stock_in_data = {
            "material_id": self.test_data['material_id'],
            "transaction_type": "in",
            "quantity": 500,
            "reference": "PO-001",
            "notes": "Initial stock"
        }
        
        success, response = self.make_request('POST', 'stock-transactions', stock_in_data, admin_token)
        self.log_test("Create stock IN transaction", success, str(response) if not success else "")

        # Stock OUT transaction
        stock_out_data = {
            "material_id": self.test_data['material_id'],
            "transaction_type": "out",
            "quantity": 50,
            "reference": "PROD-001",
            "notes": "Production consumption"
        }
        
        success, response = self.make_request('POST', 'stock-transactions', stock_out_data, admin_token)
        self.log_test("Create stock OUT transaction", success, str(response) if not success else "")

        # Get all stock transactions
        success, response = self.make_request('GET', 'stock-transactions', token=admin_token)
        self.log_test("Get all stock transactions", success, str(response) if not success else "")

    def test_products_management(self):
        """Test products CRUD operations"""
        print("\n🏭 Testing Products Management...")
        
        if 'admin' not in self.tokens:
            self.log_test("Products Test", False, "Admin token not available")
            return

        admin_token = self.tokens['admin']
        
        # Create product
        product_data = {
            "name": "Test Ürün A",
            "code": "PROD001",
            "unit": "adet"
        }
        
        success, response = self.make_request('POST', 'products', product_data, admin_token)
        if success:
            self.test_data['product_id'] = response['id']
            self.log_test("Create product", True)
        else:
            self.log_test("Create product", False, str(response))

        # Get all products
        success, response = self.make_request('GET', 'products', token=admin_token)
        self.log_test("Get all products", success, str(response) if not success else "")

    def test_production_management(self):
        """Test production order operations"""
        print("\n⚙️ Testing Production Management...")
        
        if 'admin' not in self.tokens or 'product_id' not in self.test_data:
            self.log_test("Production Test", False, "Prerequisites not met")
            return

        admin_token = self.tokens['admin']
        
        # Create production order
        production_data = {
            "product_id": self.test_data['product_id'],
            "quantity": 100,
            "planned_date": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.make_request('POST', 'production-orders', production_data, admin_token)
        if success:
            self.test_data['production_order_id'] = response['id']
            self.log_test("Create production order", True)
        else:
            self.log_test("Create production order", False, str(response))
            return

        # Get all production orders
        success, response = self.make_request('GET', 'production-orders', token=admin_token)
        self.log_test("Get all production orders", success, str(response) if not success else "")

        # Update production status to in_progress
        success, response = self.make_request('PATCH', f'production-orders/{self.test_data["production_order_id"]}/status?status=in_progress', token=admin_token)
        self.log_test("Update production status to in_progress", success, str(response) if not success else "")

        # Update production status to completed
        success, response = self.make_request('PATCH', f'production-orders/{self.test_data["production_order_id"]}/status?status=completed', token=admin_token)
        self.log_test("Update production status to completed", success, str(response) if not success else "")

    def test_consumption_tracking(self):
        """Test consumption tracking"""
        print("\n🔄 Testing Consumption Tracking...")
        
        if 'admin' not in self.tokens or 'material_id' not in self.test_data or 'production_order_id' not in self.test_data:
            self.log_test("Consumption Test", False, "Prerequisites not met")
            return

        admin_token = self.tokens['admin']
        
        # Create consumption record
        consumption_data = {
            "production_order_id": self.test_data['production_order_id'],
            "material_id": self.test_data['material_id'],
            "quantity": 25
        }
        
        success, response = self.make_request('POST', 'consumptions', consumption_data, admin_token)
        self.log_test("Create consumption record", success, str(response) if not success else "")

        # Get all consumptions
        success, response = self.make_request('GET', 'consumptions', token=admin_token)
        self.log_test("Get all consumptions", success, str(response) if not success else "")

    def test_shipments_management(self):
        """Test shipments management"""
        print("\n🚚 Testing Shipments Management...")
        
        if 'admin' not in self.tokens or 'product_id' not in self.test_data:
            self.log_test("Shipments Test", False, "Prerequisites not met")
            return

        admin_token = self.tokens['admin']
        
        # Create shipment
        shipment_data = {
            "product_id": self.test_data['product_id'],
            "quantity": 10,
            "customer_name": "Test Müşteri A",
            "destination": "İstanbul",
            "shipment_date": datetime.now(timezone.utc).isoformat()
        }
        
        success, response = self.make_request('POST', 'shipments', shipment_data, admin_token)
        if success:
            self.test_data['shipment_id'] = response['id']
            self.log_test("Create shipment", True)
        else:
            self.log_test("Create shipment", False, str(response))
            return

        # Get all shipments
        success, response = self.make_request('GET', 'shipments', token=admin_token)
        self.log_test("Get all shipments", success, str(response) if not success else "")

        # Update shipment status
        success, response = self.make_request('PATCH', f'shipments/{self.test_data["shipment_id"]}/status?status=in_transit', token=admin_token)
        self.log_test("Update shipment status to in_transit", success, str(response) if not success else "")

        success, response = self.make_request('PATCH', f'shipments/{self.test_data["shipment_id"]}/status?status=delivered', token=admin_token)
        self.log_test("Update shipment status to delivered", success, str(response) if not success else "")

    def test_cost_analysis(self):
        """Test cost analysis"""
        print("\n💰 Testing Cost Analysis...")
        
        if 'admin' not in self.tokens:
            self.log_test("Cost Analysis Test", False, "Admin token not available")
            return

        admin_token = self.tokens['admin']
        
        # Get cost analysis
        success, response = self.make_request('GET', 'costs/analysis', token=admin_token)
        self.log_test("Get cost analysis", success, str(response) if not success else "")

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📈 Testing Dashboard Statistics...")
        
        if 'admin' not in self.tokens:
            self.log_test("Dashboard Test", False, "Admin token not available")
            return

        admin_token = self.tokens['admin']
        
        # Get dashboard stats
        success, response = self.make_request('GET', 'dashboard/stats', token=admin_token)
        self.log_test("Get dashboard statistics", success, str(response) if not success else "")

    def test_user_management(self):
        """Test user management (admin only)"""
        print("\n👥 Testing User Management...")
        
        if 'admin' not in self.tokens:
            self.log_test("User Management Test", False, "Admin token not available")
            return

        admin_token = self.tokens['admin']
        
        # Get all users (admin only)
        success, response = self.make_request('GET', 'users', token=admin_token)
        self.log_test("Admin can get all users", success, str(response) if not success else "")

        # Test non-admin access
        if 'user' in self.tokens:
            success, response = self.make_request('GET', 'users', token=self.tokens['user'], expected_status=403)
            self.log_test("Non-admin cannot access user management", success, "User was able to access (should be forbidden)")

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        # Test viewer restrictions
        if 'viewer' in self.tokens:
            viewer_token = self.tokens['viewer']
            
            # Viewer should be able to view but not modify
            test_data = {"name": "Test", "code": "TEST", "unit": "kg", "unit_price": 10, "min_stock_level": 5}
            
            # Should fail with 403
            success, response = self.make_request('POST', 'raw-materials', test_data, viewer_token, 403)
            self.log_test("Viewer cannot create raw materials", success, "Viewer was able to create")
            
            success, response = self.make_request('POST', 'products', {"name": "Test", "code": "TEST", "unit": "adet"}, viewer_token, 403)
            self.log_test("Viewer cannot create products", success, "Viewer was able to create")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting ERP System Backend Tests...")
        print(f"Testing against: {self.base_url}")
        
        self.test_user_registration_and_login()
        self.test_raw_materials_management()
        self.test_stock_transactions()
        self.test_products_management()
        self.test_production_management()
        self.test_consumption_tracking()
        self.test_shipments_management()
        self.test_cost_analysis()
        self.test_dashboard_stats()
        self.test_user_management()
        self.test_role_based_access()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ERPSystemTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())