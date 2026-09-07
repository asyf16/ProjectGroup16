import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SuppliersSection from './components/SuppliersSection';
import CreateOrderModal from './components/CreateOrderModal';
import RequesterOrdersSection from './components/RequesterOrdersSection';
import CourierOrdersSection from './components/CourierOrdersSection';
import CourierActiveSection from './components/CourierActiveSection';
import CreditsSection from './components/CreditsSection';
import ProfileSection from './components/ProfileSection';
import { initialSuppliers, initialOrders, initialTransactions } from './data/mockData';

export default function App() {
  // Current logged in user (NUS student)
  const [user, setUser] = useState({
    id: 'usr-1',
    name: 'Student User',
    email: 'student1@u.nus.edu',
    telegram: '@student1'
  });

  // Main UI States
  const [role, setRole] = useState('REQUESTER'); // 'REQUESTER' | 'COURIER'
  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers', 'my-requests', 'courier-browse', 'courier-active', 'credits', 'profile'
  
  // Data States
  const [suppliers] = useState(initialSuppliers);
  const [orders, setOrders] = useState(initialOrders);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [availableCredits, setAvailableCredits] = useState(20);
  const [reservedCredits, setReservedCredits] = useState(1);

  // Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedSupplierForOrder, setSelectedSupplierForOrder] = useState(null);

  // Active courier task for the current user
  const activeCourierTask = orders.find(
    (o) => o.courierId === user.id && ['ACCEPTED', 'PICKED_UP', 'DELIVERED'].includes(o.status)
  );

  // Quick Open Modal from Supplier List
  const handleQuickOpenModal = (supplier) => {
    setSelectedSupplierForOrder(supplier);
    setIsOrderModalOpen(true);
  };

  // Requester: Submit New Errand Request
  const handleCreateOrder = (newOrderData) => {
    const newOrderId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: newOrderId,
      ...newOrderData,
      requesterName: `${user.name} (You)`,
      requesterId: user.id,
      courierName: null,
      courierId: null,
      status: 'OPEN',
      createdAt: 'Just now'
    };

    // Deduct available credit and hold in reserve
    setAvailableCredits((prev) => prev - 1);
    setReservedCredits((prev) => prev + 1);

    // Record ledger transaction
    const newTx = {
      id: `TX-${Date.now()}`,
      time: 'Just now',
      type: 'CREDIT_RESERVED',
      title: `Errand Request Created (${newOrderData.supplierName})`,
      orderRef: `#${newOrderId}`,
      amount: -1,
      status: 'HELD'
    };

    setOrders([newOrder, ...orders]);
    setTransactions([newTx, ...transactions]);
    setActiveTab('my-requests');
  };

  // Requester: Cancel Order
  const handleCancelOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
    );

    // Release reserved credit back to available balance
    setAvailableCredits((prev) => prev + 1);
    setReservedCredits((prev) => Math.max(0, prev - 1));

    // Record refund in transactions
    setTransactions((prev) => [
      {
        id: `TX-${Date.now()}`,
        time: 'Just now',
        type: 'CREDIT_RELEASED',
        title: 'Order Cancelled by Requester',
        orderRef: `#${orderId}`,
        amount: 1,
        status: 'RELEASED'
      },
      ...prev
    ]);
  };

  // Requester: Confirm Delivery Receipt
  const handleConfirmDelivery = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'COMPLETED' } : o))
    );

    // Deduct reserved credit permanently
    setReservedCredits((prev) => Math.max(0, prev - 1));

    setTransactions((prev) => [
      {
        id: `TX-${Date.now()}`,
        time: 'Just now',
        type: 'CREDIT_TRANSFERRED',
        title: 'Delivery Confirmed & Credits Settled',
        orderRef: `#${orderId}`,
        amount: -1,
        status: 'COMPLETED'
      },
      ...prev
    ]);
  };

  // Courier: Accept Open Order
  const handleAcceptOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'ACCEPTED', courierName: user.name, courierId: user.id }
          : o
      )
    );
    setActiveTab('courier-active');
  };

  // Courier: Mark Picked Up
  const handleMarkPickedUp = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'PICKED_UP' } : o))
    );
  };

  // Courier: Mark Delivered
  const handleMarkDelivered = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'DELIVERED' } : o))
    );
  };

  return (
    <div className="app-root">
      {/* Top Navigation */}
      <Navbar
        role={role}
        setRole={setRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        availableCredits={availableCredits}
        user={user}
      />

      {/* Main Sections */}
      <main className="main-content">
        {/* REQUESTER FLOWS */}
        {role === 'REQUESTER' && activeTab === 'suppliers' && (
          <SuppliersSection
            suppliers={suppliers}
            onQuickOpenModal={handleQuickOpenModal}
          />
        )}

        {role === 'REQUESTER' && activeTab === 'my-requests' && (
          <RequesterOrdersSection
            orders={orders.filter((o) => o.requesterId === user.id)}
            onCancelOrder={handleCancelOrder}
            onConfirmDelivery={handleConfirmDelivery}
            onNewRequestClick={() => setActiveTab('suppliers')}
          />
        )}

        {/* COURIER FLOWS */}
        {role === 'COURIER' && activeTab === 'courier-browse' && (
          <CourierOrdersSection
            orders={orders}
            currentUserId={user.id}
            onAcceptOrder={handleAcceptOrder}
            hasActiveTask={!!activeCourierTask}
          />
        )}

        {role === 'COURIER' && activeTab === 'courier-active' && (
          <CourierActiveSection
            activeTask={activeCourierTask}
            onMarkPickedUp={handleMarkPickedUp}
            onMarkDelivered={handleMarkDelivered}
            onFindNewTask={() => setActiveTab('courier-browse')}
          />
        )}

        {/* COMMON APP SECTIONS */}
        {activeTab === 'credits' && (
          <CreditsSection
            availableCredits={availableCredits}
            reservedCredits={reservedCredits}
            transactions={transactions}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileSection
            user={user}
            onUpdateUser={setUser}
            role={role}
            setRole={setRole}
            availableCredits={availableCredits}
          />
        )}
      </main>

      {/* Order Creation Modal */}
      <CreateOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        supplier={selectedSupplierForOrder}
        availableCredits={availableCredits}
        onSubmitOrder={handleCreateOrder}
      />
    </div>
  );
}
