from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class TransactionType(str, Enum):
    IN = "in"
    OUT = "out"

class ProductionStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ShipmentStatus(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class RawMaterial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    unit: str
    unit_price: float
    current_stock: float = 0
    min_stock_level: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RawMaterialCreate(BaseModel):
    name: str
    code: str
    unit: str
    unit_price: float
    min_stock_level: float = 0

class StockTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    material_id: str
    transaction_type: TransactionType
    quantity: float
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockTransactionCreate(BaseModel):
    material_id: str
    transaction_type: TransactionType
    quantity: float
    reference: Optional[str] = None
    notes: Optional[str] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    unit: str
    current_stock: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    code: str
    unit: str

class MachineType(str, Enum):
    MACHINE_1 = "Makine 1"
    MACHINE_2 = "Makine 2"

class MasuraType(str, Enum):
    MASURA_100 = "Masura 100"
    MASURA_120 = "Masura 120"
    MASURA_150 = "Masura 150"
    MASURA_200 = "Masura 200"
    NO_MASURA = "Masura Yok"

class ManufacturingRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    production_date: datetime
    machine: MachineType
    thickness_mm: float  # Kalınlık (mm)
    width_cm: float  # En (cm)
    length_m: float  # Metre
    quantity: int  # Adet
    square_meters: float  # Metrekare (otomatik hesaplanacak)
    masura_type: MasuraType
    masura_quantity: int  # Masura Adedi
    model: str  # Model açıklaması
    gas_consumption_kg: float  # Gaz Payı (kg)
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ManufacturingRecordCreate(BaseModel):
    production_date: datetime
    machine: MachineType
    thickness_mm: float
    width_cm: float
    length_m: float
    quantity: int
    masura_type: MasuraType
    masura_quantity: int
    gas_consumption_kg: float

class ProductionOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    product_id: str
    product_name: str
    quantity: float
    status: ProductionStatus
    planned_date: datetime
    completed_date: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductionOrderCreate(BaseModel):
    product_id: str
    quantity: float
    planned_date: datetime

class Consumption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    production_order_id: str
    material_id: str
    material_name: str
    quantity: float
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConsumptionCreate(BaseModel):
    production_order_id: str
    material_id: str
    quantity: float

class Shipment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shipment_number: str
    product_id: str
    product_name: str
    quantity: float
    customer_name: str
    destination: str
    status: ShipmentStatus
    shipment_date: datetime
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShipmentCreate(BaseModel):
    product_id: str
    quantity: float
    customer_name: str
    destination: str
    shipment_date: datetime

class CostAnalysis(BaseModel):
    material_id: str
    material_name: str
    total_quantity: float
    total_cost: float

class DashboardStats(BaseModel):
    total_raw_materials: int
    total_products: int
    active_productions: int
    pending_shipments: int
    low_stock_materials: int

# Auth Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# Auth Routes
@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_pw = hash_password(user_data.password)
    user_obj = User(
        username=user_data.username,
        email=user_data.email,
        role=user_data.role
    )
    
    doc = user_obj.model_dump()
    doc['password'] = hashed_pw
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['username'], user['role'])
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role']
        }
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    return User(**user)

# Raw Material Routes
@api_router.post("/raw-materials", response_model=RawMaterial)
async def create_raw_material(material_data: RawMaterialCreate, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    existing = await db.raw_materials.find_one({"code": material_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Material code already exists")
    
    material_obj = RawMaterial(**material_data.model_dump())
    doc = material_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.raw_materials.insert_one(doc)
    return material_obj

@api_router.get("/raw-materials", response_model=List[RawMaterial])
async def get_raw_materials(current_user = Depends(get_current_user)):
    materials = await db.raw_materials.find({}, {"_id": 0}).to_list(1000)
    for mat in materials:
        if isinstance(mat['created_at'], str):
            mat['created_at'] = datetime.fromisoformat(mat['created_at'])
    return materials

@api_router.get("/raw-materials/{material_id}", response_model=RawMaterial)
async def get_raw_material(material_id: str, current_user = Depends(get_current_user)):
    material = await db.raw_materials.find_one({"id": material_id}, {"_id": 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    if isinstance(material['created_at'], str):
        material['created_at'] = datetime.fromisoformat(material['created_at'])
    return RawMaterial(**material)

# Stock Transaction Routes
@api_router.post("/stock-transactions", response_model=StockTransaction)
async def create_stock_transaction(transaction_data: StockTransactionCreate, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    material = await db.raw_materials.find_one({"id": transaction_data.material_id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    transaction_obj = StockTransaction(
        **transaction_data.model_dump(),
        created_by=current_user['username']
    )
    
    doc = transaction_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.stock_transactions.insert_one(doc)
    
    # Update material stock
    new_stock = material['current_stock']
    if transaction_data.transaction_type == TransactionType.IN:
        new_stock += transaction_data.quantity
    else:
        new_stock -= transaction_data.quantity
    
    await db.raw_materials.update_one(
        {"id": transaction_data.material_id},
        {"$set": {"current_stock": new_stock}}
    )
    
    return transaction_obj

@api_router.get("/stock-transactions", response_model=List[StockTransaction])
async def get_stock_transactions(current_user = Depends(get_current_user)):
    transactions = await db.stock_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for trans in transactions:
        if isinstance(trans['created_at'], str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    return transactions

# Product Routes
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    existing = await db.products.find_one({"code": product_data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Product code already exists")
    
    product_obj = Product(**product_data.model_dump())
    doc = product_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.products.insert_one(doc)
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user = Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for prod in products:
        if isinstance(prod['created_at'], str):
            prod['created_at'] = datetime.fromisoformat(prod['created_at'])
    return products

# Production Order Routes
@api_router.post("/production-orders", response_model=ProductionOrder)
async def create_production_order(order_data: ProductionOrderCreate, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    product = await db.products.find_one({"id": order_data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Generate order number
    count = await db.production_orders.count_documents({}) + 1
    order_number = f"PRD-{count:05d}"
    
    order_obj = ProductionOrder(
        order_number=order_number,
        product_id=order_data.product_id,
        product_name=product['name'],
        quantity=order_data.quantity,
        status=ProductionStatus.PLANNED,
        planned_date=order_data.planned_date,
        created_by=current_user['username']
    )
    
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['planned_date'] = doc['planned_date'].isoformat()
    
    await db.production_orders.insert_one(doc)
    return order_obj

@api_router.get("/production-orders", response_model=List[ProductionOrder])
async def get_production_orders(current_user = Depends(get_current_user)):
    orders = await db.production_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for order in orders:
        if isinstance(order['created_at'], str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order['planned_date'], str):
            order['planned_date'] = datetime.fromisoformat(order['planned_date'])
        if order.get('completed_date') and isinstance(order['completed_date'], str):
            order['completed_date'] = datetime.fromisoformat(order['completed_date'])
    return orders

@api_router.patch("/production-orders/{order_id}/status")
async def update_production_status(order_id: str, status: ProductionStatus, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    order = await db.production_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {"status": status}
    if status == ProductionStatus.COMPLETED:
        update_data['completed_date'] = datetime.now(timezone.utc).isoformat()
        # Update product stock
        await db.products.update_one(
            {"id": order['product_id']},
            {"$inc": {"current_stock": order['quantity']}}
        )
    
    await db.production_orders.update_one({"id": order_id}, {"$set": update_data})
    return {"message": "Status updated successfully"}

# Consumption Routes
@api_router.post("/consumptions", response_model=Consumption)
async def create_consumption(consumption_data: ConsumptionCreate, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    material = await db.raw_materials.find_one({"id": consumption_data.material_id})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    if material['current_stock'] < consumption_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    consumption_obj = Consumption(
        **consumption_data.model_dump(),
        material_name=material['name'],
        created_by=current_user['username']
    )
    
    doc = consumption_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.consumptions.insert_one(doc)
    
    # Update material stock
    await db.raw_materials.update_one(
        {"id": consumption_data.material_id},
        {"$inc": {"current_stock": -consumption_data.quantity}}
    )
    
    return consumption_obj

@api_router.get("/consumptions", response_model=List[Consumption])
async def get_consumptions(current_user = Depends(get_current_user)):
    consumptions = await db.consumptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for cons in consumptions:
        if isinstance(cons['created_at'], str):
            cons['created_at'] = datetime.fromisoformat(cons['created_at'])
    return consumptions

# Shipment Routes
@api_router.post("/shipments", response_model=Shipment)
async def create_shipment(shipment_data: ShipmentCreate, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    product = await db.products.find_one({"id": shipment_data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product['current_stock'] < shipment_data.quantity:
        raise HTTPException(status_code=400, detail="Insufficient product stock")
    
    # Generate shipment number
    count = await db.shipments.count_documents({}) + 1
    shipment_number = f"SHP-{count:05d}"
    
    shipment_obj = Shipment(
        shipment_number=shipment_number,
        product_id=shipment_data.product_id,
        product_name=product['name'],
        quantity=shipment_data.quantity,
        customer_name=shipment_data.customer_name,
        destination=shipment_data.destination,
        status=ShipmentStatus.PENDING,
        shipment_date=shipment_data.shipment_date,
        created_by=current_user['username']
    )
    
    doc = shipment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['shipment_date'] = doc['shipment_date'].isoformat()
    await db.shipments.insert_one(doc)
    
    # Update product stock
    await db.products.update_one(
        {"id": shipment_data.product_id},
        {"$inc": {"current_stock": -shipment_data.quantity}}
    )
    
    return shipment_obj

@api_router.get("/shipments", response_model=List[Shipment])
async def get_shipments(current_user = Depends(get_current_user)):
    shipments = await db.shipments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for ship in shipments:
        if isinstance(ship['created_at'], str):
            ship['created_at'] = datetime.fromisoformat(ship['created_at'])
        if isinstance(ship['shipment_date'], str):
            ship['shipment_date'] = datetime.fromisoformat(ship['shipment_date'])
    return shipments

@api_router.patch("/shipments/{shipment_id}/status")
async def update_shipment_status(shipment_id: str, status: ShipmentStatus, current_user = Depends(get_current_user)):
    if current_user['role'] == 'viewer':
        raise HTTPException(status_code=403, detail="Permission denied")
    
    result = await db.shipments.update_one({"id": shipment_id}, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    return {"message": "Status updated successfully"}

# Cost Analysis Routes
@api_router.get("/costs/analysis", response_model=List[CostAnalysis])
async def get_cost_analysis(current_user = Depends(get_current_user)):
    consumptions = await db.consumptions.find({}, {"_id": 0}).to_list(10000)
    materials = await db.raw_materials.find({}, {"_id": 0}).to_list(1000)
    
    material_map = {m['id']: m for m in materials}
    cost_data = {}
    
    for cons in consumptions:
        mat_id = cons['material_id']
        if mat_id not in cost_data:
            material = material_map.get(mat_id)
            if material:
                cost_data[mat_id] = {
                    'material_id': mat_id,
                    'material_name': material['name'],
                    'total_quantity': 0,
                    'total_cost': 0
                }
        
        if mat_id in cost_data:
            material = material_map[mat_id]
            cost_data[mat_id]['total_quantity'] += cons['quantity']
            cost_data[mat_id]['total_cost'] += cons['quantity'] * material['unit_price']
    
    return list(cost_data.values())

# Dashboard Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user = Depends(get_current_user)):
    total_raw_materials = await db.raw_materials.count_documents({})
    total_products = await db.products.count_documents({})
    active_productions = await db.production_orders.count_documents({
        "status": {"$in": ["planned", "in_progress"]}
    })
    pending_shipments = await db.shipments.count_documents({"status": "pending"})
    
    # Low stock materials
    materials = await db.raw_materials.find({}, {"_id": 0}).to_list(1000)
    low_stock_materials = sum(1 for m in materials if m['current_stock'] <= m['min_stock_level'])
    
    return DashboardStats(
        total_raw_materials=total_raw_materials,
        total_products=total_products,
        active_productions=active_productions,
        pending_shipments=pending_shipments,
        low_stock_materials=low_stock_materials
    )

# User Management Routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user['created_at'], str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if user_id == current_user['user_id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()