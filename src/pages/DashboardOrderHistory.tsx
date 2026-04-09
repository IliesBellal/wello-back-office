/**
 * Order History Page
 * 
 * Under "Tableau de bord" > "Historique des commandes"
 * Complete order history with table layout, filters, pagination, and detail modal
 */

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExportButton } from '@/components/analytics';
import { analyticsService } from '@/services/analyticsService';
import { subDays } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complétée' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulée' },
};

const CHANNEL_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  takeaway: 'À emporter',
  ubereats: 'Uber Eats',
  deliveroo: 'Deliveroo',
  clickcollect: 'Click & Collect',
};

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Carte',
  cash: 'Espèces',
  applepay: 'Apple Pay',
  uberpay: 'Uber Pay',
  cancelled: 'Annulée',
};

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

const OrderDetailModal = ({ isOpen, onClose, orderId }: OrderDetailModalProps) => {
  if (!isOpen) return null;

  // Mock order detail data
  const orderDetail = {
    id: orderId,
    number: `#${parseInt(orderId) + 10280}`,
    date: '08/04/2026',
    time: '14:32',
    customer: {
      name: 'Marie Dubois',
      email: 'marie@example.com',
      phone: '06 12 34 56 78',
      loyalty: 'Fidèle 5+',
    },
    items: [
      { name: 'Burger Premium', quantity: 1, price: 18.50 },
      { name: 'Frites', quantity: 1, price: 5.00 },
      { name: 'Boisson 33cl', quantity: 2, price: 3.50 },
    ],
    subtotal: 29.50,
    discount: 0,
    tax: 5.71,
    total: 35.21,
    payment: {
      method: 'card',
      status: 'completed',
      reference: 'CH-2026-04-08-14032',
    },
    timeline: [
      { time: '14:30', action: 'Commande créée' },
      { time: '14:35', action: 'Préparation en cours' },
      { time: '14:40', action: 'Prête' },
      { time: '14:42', action: 'Retirée' },
    ],
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="bg-card border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card border-b border-border">
          <CardTitle className="text-lg font-bold">Détails Commande {orderDetail.number}</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Infos générales */}
          <div>
            <h3 className="font-semibold mb-3">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Commande</p>
                <p className="font-medium">{orderDetail.number}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Date/Heure</p>
                <p className="font-medium">{orderDetail.date} à {orderDetail.time}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Canal</p>
                <p className="font-medium">Restaurant</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Statut</p>
                <p className="font-medium text-green-600">Complétée</p>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Client</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nom</p>
                <p className="font-medium">{orderDetail.customer.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Segment</p>
                <p className="font-medium">{orderDetail.customer.loyalty}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{orderDetail.customer.email}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Téléphone</p>
                <p className="font-medium">{orderDetail.customer.phone}</p>
              </div>
            </div>
          </div>

          {/* Produits */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Produits</h3>
            <div className="space-y-2">
              {orderDetail.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totaux */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Totaux</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{orderDetail.subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Remise</span>
                <span>{orderDetail.discount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between">
                <span>TVA</span>
                <span>{orderDetail.tax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2">
                <span>Total</span>
                <span>{orderDetail.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Paiement</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Méthode</p>
                <p className="font-medium">{PAYMENT_LABELS[orderDetail.payment.method]}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Statut</p>
                <p className="font-medium text-green-600">Payée</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Référence</p>
                <p className="font-medium text-xs font-mono">{orderDetail.payment.reference}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Historique</h3>
            <div className="space-y-2">
              {orderDetail.timeline.map((event, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="text-muted-foreground min-w-fit">{event.time}</span>
                  <div className="flex gap-2 items-start">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    <span>{event.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-border pt-6 flex gap-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition">
              Reprendre la commande
            </button>
            <button className="px-4 py-2 border border-border rounded text-sm hover:bg-muted transition">
              Voir la facture
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DashboardOrderHistory = () => {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [searchInput, setSearchInput] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const itemsPerPage = 50;

  // Fetch order history
  const orderHistory = useMemo(() => {
    return analyticsService.getOrderHistory(
      startDate,
      endDate,
      selectedChannel !== 'all' ? selectedChannel : undefined,
      selectedStatus !== 'all' ? selectedStatus : undefined,
      searchInput || undefined,
      currentPage
    );
  }, [startDate, endDate, selectedChannel, selectedStatus, searchInput, currentPage]);

  // Mock: Generate more sample data for pagination
  const allOrders = Array.from({ length: 150 }, (_, i) => ({
    id: i.toString(),
    number: `#${10284 - i}`,
    date: new Date(Date.now() - i * 86400000).toLocaleDateString('fr-FR'),
    time: `${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
    customer_name: ['Marie Dubois', 'Jean Martin', 'Sophie Bernard', 'Pierre Durand', 'Client anonyme'][Math.floor(Math.random() * 5)],
    channel: ['restaurant', 'takeaway', 'ubereats', 'deliveroo'][Math.floor(Math.random() * 4)] as string,
    status: ['completed', 'cancelled', 'pending'][Math.floor(Math.random() * 3)] as string,
    total: Math.floor(Math.random() * 80) + 15,
    payment_method: ['card', 'cash', 'applepay'][Math.floor(Math.random() * 3)] as string,
  }));

  // Apply filters
  const filteredOrders = allOrders.filter(order => {
    const matchChannel = selectedChannel === 'all' || order.channel === selectedChannel;
    const matchStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchPayment = selectedPayment === 'all' || order.payment_method === selectedPayment;
    const matchSearch = !searchInput || order.number.includes(searchInput) || order.customer_name.toLowerCase().includes(searchInput.toLowerCase());
    return matchChannel && matchStatus && matchPayment && matchSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDetailOpen = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Historique des Commandes</h1>
          <p className="text-muted-foreground">Suivi complet des commandes avec filtres et détails</p>
        </div>

        {/* Filtres */}
        <Card className="bg-card border border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Période</label>
                <AdvancedDatePicker 
                  value={{ from: startDate, to: endDate }}
                  onChange={(range) => {
                    setStartDate(range.from);
                    setEndDate(range.to);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Canal</label>
                <Select value={selectedChannel} onValueChange={(v) => { setSelectedChannel(v); setCurrentPage(1); }}>
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les canaux</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="takeaway">À emporter</SelectItem>
                    <SelectItem value="ubereats">Uber Eats</SelectItem>
                    <SelectItem value="deliveroo">Deliveroo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Statut</label>
                <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="completed">Complétée</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Paiement</label>
                <Select value={selectedPayment} onValueChange={(v) => { setSelectedPayment(v); setCurrentPage(1); }}>
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les paiements</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="applepay">Apple Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Recherche</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="N° commande ou client" 
                    className="pl-8"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-card border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredOrders.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total CA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Panier moyen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(filteredOrders.reduce((sum, o) => sum + o.total, 0) / filteredOrders.length).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau */}
        <Card className="bg-card border border-border mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Commandes ({filteredOrders.length})</CardTitle>
            <ExportButton data={paginatedOrders} filename={`historique-commandes-${startDate.toISOString().split('T')[0]}`} />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="font-semibold">Commande</TableHead>
                    <TableHead className="font-semibold">Date/Heure</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Canal</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="text-right font-semibold">Montant</TableHead>
                    <TableHead className="font-semibold">Paiement</TableHead>
                    <TableHead className="text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.id} className="border-b border-border">
                      <TableCell className="font-medium">{order.number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.date} {order.time}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell className="text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {CHANNEL_LABELS[order.channel]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status].bg} ${ORDER_STATUS_COLORS[order.status].text}`}>
                          {ORDER_STATUS_COLORS[order.status].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </TableCell>
                      <TableCell className="text-sm">{PAYMENT_LABELS[order.payment_method]}</TableCell>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => handleDetailOpen(order.id)}
                          className="p-1 hover:bg-muted rounded transition inline-flex"
                          title="Voir détails"
                        >
                          <Eye size={16} className="text-muted-foreground" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredOrders.length)} sur {filteredOrders.length}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded text-sm transition ${
                      currentPage === pageNum 
                        ? 'bg-blue-500 text-white' 
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <OrderDetailModal 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        orderId={selectedOrderId || ''}
      />
    </DashboardLayout>
  );
};

export default DashboardOrderHistory;
