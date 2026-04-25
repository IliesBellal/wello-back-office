/**
 * Order History Page
 * 
 * Under "Tableau de bord" > "Historique des commandes"
 * Complete order history with table layout, filters, pagination, and detail modal
 */

import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { AdvancedDatePicker } from '@/components/shared/AdvancedDatePicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/analytics';
import { analyticsService, type OrderHistoryResponse } from '@/services/analyticsService';
import { useOrderHistorySearchParams } from '@/hooks/useOrderHistorySearchParams';
import { ordersService, type Order } from '@/services/ordersService';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, Clock3, LoaderCircle, XCircle, RotateCcw } from 'lucide-react';

const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complétée', icon: CheckCircle2 },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente', icon: Clock3 },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours', icon: LoaderCircle },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annulée', icon: XCircle },
  refunded: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Remboursée', icon: RotateCcw },
};

const CHANNEL_LABELS: Record<string, string> = {
  restaurant: 'Sur place',
  takeaway: 'Emporter',
  delivery: 'Livraison',
  ubereats: 'Uber Eats',
  deliveroo: 'Deliveroo',
  clickcollect: 'Click & Collect',
};

const renderChannelBadge = (channel: string) => {
  if (channel === 'ubereats') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-black px-2 py-1 text-xs"
        style={{ fontFamily: "'UberMoveText', 'Avenir Next', 'Segoe UI', sans-serif" }}
      >
        <span className="font-semibold text-white">Uber</span>
        <span className="font-semibold text-[#06C167]">Eats</span>
      </span>
    );
  }

  if (channel === 'deliveroo') {
    return (
      <span
        className="inline-flex items-center rounded px-2 py-1 text-xs font-semibold text-white"
        style={{
          backgroundColor: '#00CCBC',
          fontFamily: "'Stratos Deliveroo', 'Avenir Next', 'Segoe UI', sans-serif",
          letterSpacing: '0.01em',
        }}
      >
        Deliveroo
      </span>
    );
  }

  return (
    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
      {CHANNEL_LABELS[channel] || channel}
    </span>
  );
};

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Carte',
  cash: 'Espèces',
  applepay: 'Apple Pay',
  stripe: 'En ligne',
  uberpay: 'Uber Pay',
  cancelled: 'Annulée',
  cb: 'Carte',
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

const formatCents = (value: number): string => {
  return formatCurrency(value / 100);
};

const formatTimestamp = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '-';
  }

  const date = typeof value === 'number'
    ? new Date(value > 9999999999 ? value : value * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getOrderChannelLabel = (order: Order): string => {
  const brand = order.brand?.toLowerCase() || '';
  const fulfillmentType = order.fulfillment_type?.toLowerCase() || '';
  const orderType = order.order_type?.toLowerCase() || '';

  if (brand.includes('uber') || fulfillmentType.includes('uber')) {
    return CHANNEL_LABELS.ubereats;
  }

  if (brand.includes('deliveroo') || fulfillmentType.includes('deliveroo')) {
    return CHANNEL_LABELS.deliveroo;
  }

  if (orderType.includes('take')) {
    return CHANNEL_LABELS.takeaway;
  }

  if (orderType.includes('click')) {
    return CHANNEL_LABELS.clickcollect;
  }

  return CHANNEL_LABELS.restaurant;
};

const getOrderStatusConfig = (order: Order) => {
  const state = order.state?.toLowerCase() || '';
  const brandStatus = order.brand_status?.toLowerCase() || '';

  if (state.includes('cancel') || brandStatus.includes('cancel')) {
    return ORDER_STATUS_COLORS.cancelled;
  }

  if (state.includes('refund') || brandStatus.includes('refund')) {
    return ORDER_STATUS_COLORS.refunded;
  }

  if (state.includes('open') || state.includes('pending') || brandStatus.includes('pending')) {
    return ORDER_STATUS_COLORS.pending;
  }

  return ORDER_STATUS_COLORS.completed;
};

const getPaymentMethodLabel = (method: string): string => {
  return PAYMENT_LABELS[method.toLowerCase()] || method;
};

const hasKnownCustomer = (order: Order): boolean => {
  return Boolean(order.customer);
};

const shouldShowDeliveryFees = (order: Order): boolean => {
  return order.order_type === 'DELIVERY';
};

const OrderDetailSkeleton = () => {
  return (
    <CardContent className="space-y-6 pt-6">
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-32 w-full" />
    </CardContent>
  );
};

const toLocalDateParam = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromLocalDateParam = (dateParam: string): Date => {
  const [year, month, day] = dateParam.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
};

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefund: (amount: number, reason: string) => Promise<void>;
  maxAmount: number;
}

const RefundModal = ({ isOpen, onClose, onRefund, maxAmount }: RefundModalProps) => {
  const [amount, setAmount] = useState<string>(maxAmount.toString());
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!amount || !reason) return;
    setIsLoading(true);
    try {
      await onRefund(parseFloat(amount), reason);
      setAmount(maxAmount.toString());
      setReason('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <Card className="bg-card border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card border-b border-border">
          <CardTitle className="text-lg font-bold">Rembourser</CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Montant</label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Montant max: {maxAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Motif</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-background border border-input">
                <SelectValue placeholder="Sélectionner un motif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Demande client</SelectItem>
                <SelectItem value="duplicate_charge">Double paiement</SelectItem>
                <SelectItem value="order_cancelled">Commande annulée</SelectItem>
                <SelectItem value="product_return">Retour produit</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded text-sm hover:bg-muted transition disabled:opacity-50"
              disabled={isLoading}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!amount || !reason || isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isLoading ? 'Traitement...' : 'Rembourser'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

const OrderDetailModal = ({ isOpen, onClose, orderId }: OrderDetailModalProps) => {
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const { data: orderDetail, isLoading, error } = useQuery<Order>({
    queryKey: ['dashboard-order-history-detail', orderId],
    queryFn: () => ordersService.getOrderById(orderId),
    enabled: isOpen && Boolean(orderId),
  });

  if (!isOpen) return null;

  const handleRefund = async (amount: number, reason: string) => {
    try {
      // TODO: Call API for refund
      // await refundService.createRefund(orderId, amount, reason);
      console.log(`Refund requested: ${amount}€ for reason: ${reason}`);
    } catch (error) {
      console.error('Refund failed:', error);
    }
  };

  const detailStatusConfig = orderDetail ? getOrderStatusConfig(orderDetail) : null;
  const DetailStatusIcon = detailStatusConfig?.icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <Card
          className="bg-card border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold">Détails Commande {orderDetail ? `#${orderDetail.order_num}` : ''}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">ID: {orderDetail?.order_id || orderId}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsRefundModalOpen(true)}
                disabled={isLoading || !orderDetail}
                className="px-3 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition"
              >
                Rembourser
              </button>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
          </CardHeader>
        {isLoading && <OrderDetailSkeleton />}
        {!isLoading && error && (
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">Impossible de charger les détails de la commande.</p>
          </CardContent>
        )}
        {!isLoading && orderDetail && (
        <CardContent className="space-y-6 pt-6">
          {/* Infos générales */}
          <div>
            <h3 className="font-semibold mb-3">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Commande</p>
                <p className="font-medium">#{orderDetail.order_num}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Date/Heure</p>
                <p className="font-medium">{formatTimestamp(orderDetail.callHour || orderDetail.creation_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Canal</p>
                <p className="font-medium">{getOrderChannelLabel(orderDetail)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Statut</p>
                <p className={`inline-flex items-center gap-1 font-medium ${detailStatusConfig.text}`}>
                  {DetailStatusIcon && <DetailStatusIcon className="h-3.5 w-3.5" />}
                  {detailStatusConfig.label}
                </p>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Client</h3>
            {hasKnownCustomer(orderDetail) ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nom</p>
                  <p className="font-medium">{orderDetail.customer?.customer_name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{orderDetail.customer?.customer_email || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Téléphone</p>
                  <p className="font-medium">{orderDetail.customer?.customer_tel || '-'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun client renseigné</p>
            )}
          </div>

          {/* Produits */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Produits</h3>
            <div className="space-y-2">
              {orderDetail.products.map((item) => (
                <div key={item.order_item_id} className="flex justify-between text-sm gap-4">
                  <div>
                    <div>{item.name} x{item.quantity}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    )}
                  </div>
                  <span>{formatCents(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totaux */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Totaux</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>HT</span>
                <span>{formatCents(orderDetail.HT)}</span>
              </div>
              {shouldShowDeliveryFees(orderDetail) && (
                <div className="flex justify-between">
                  <span>Frais de livraison</span>
                  <span>{formatCents(orderDetail.delivery_fees)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>TVA</span>
                <span>{formatCents(orderDetail.TVA)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2">
                <span>Total</span>
                <span>{formatCents(orderDetail.TTC)}</span>
              </div>
            </div>
          </div>

          {/* Paiements */}
          <div className="border-t border-border pt-6">
            <h3 className="font-semibold mb-3">Paiements</h3>
            <div className="space-y-4">
              {orderDetail.payments.map((payment) => (
                <div key={payment.payment_id} className="border border-border rounded p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Montant</p>
                      <p className="font-bold">{formatCents(payment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Méthode</p>
                      <p className="font-medium">{getPaymentMethodLabel(payment.mop)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Statut</p>
                      <p className="font-medium text-green-600">{payment.enabled ? 'Payée' : 'Annulée'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Référence</p>
                      <p className="font-medium text-xs font-mono">{payment.payment_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">{formatTimestamp(payment.payment_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </CardContent>
        )}
      </Card>
    </div>

    <RefundModal
      isOpen={isRefundModalOpen}
      onClose={() => setIsRefundModalOpen(false)}
      onRefund={handleRefund}
      maxAmount={orderDetail ? orderDetail.TTC / 100 : 0}
    />
    </>
  );
};

export const DashboardOrderHistory = () => {
  const {
    page,
    limit,
    startDate,
    endDate,
    channel,
    status,
    search,
    orderId,
    handlePageChange,
    setOrderId,
    clearOrderId,
    applyFilters,
  } = useOrderHistorySearchParams();

  const [draftStartDate, setDraftStartDate] = useState<Date>(startDate);
  const [draftEndDate, setDraftEndDate] = useState<Date>(endDate);
  const [draftChannel, setDraftChannel] = useState<string>(channel);
  const [draftStatus, setDraftStatus] = useState<string>(status);
  const [draftSearch, setDraftSearch] = useState<string>(search);

  const startDateKey = toLocalDateParam(startDate);
  const endDateKey = toLocalDateParam(endDate);

  useEffect(() => {
    setDraftStartDate(fromLocalDateParam(startDateKey));
    setDraftEndDate(fromLocalDateParam(endDateKey));
    setDraftChannel(channel);
    setDraftStatus(status);
    setDraftSearch(search);
  }, [startDateKey, endDateKey, channel, status, search]);

  const handleApplyFilters = () => {
    applyFilters({
      startDate: draftStartDate,
      endDate: draftEndDate,
      channel: draftChannel,
      status: draftStatus,
      search: draftSearch,
    });
  };

  const queryKey = useMemo(
    () => [
      'dashboard-order-history',
      {
        page,
        limit,
        startDate: toLocalDateParam(startDate),
        endDate: toLocalDateParam(endDate),
        channel,
        status,
        search,
      },
    ],
    [channel, endDate, limit, page, search, startDate, status]
  );

  const {
    data: orderHistory,
    isLoading,
    isFetching,
    error,
  } = useQuery<OrderHistoryResponse>({
    queryKey,
    queryFn: () =>
      analyticsService.getOrderHistory(
        startDate,
        endDate,
        channel !== 'all' ? channel : undefined,
        status !== 'all' ? status : undefined,
        search || undefined,
        page,
        limit
      ),
    placeholderData: keepPreviousData,
  });

  const resolvedOrderHistory = orderHistory ?? {
    orders: [],
    total_count: 0,
    page,
    per_page: limit,
    total_pages: 1,
  };

  const filteredOrders = resolvedOrderHistory.orders;
  const totalOrders = resolvedOrderHistory.total_count || 0;
  const currentPage = resolvedOrderHistory.page || page;
  const currentLimit = resolvedOrderHistory.per_page || limit;
  const totalPages = Math.max(
    1,
    resolvedOrderHistory.total_pages ?? Math.ceil(Math.max(totalOrders, 1) / currentLimit)
  );
  const displayStart = filteredOrders.length === 0 ? 0 : ((currentPage - 1) * currentLimit) + 1;
  const displayEnd = filteredOrders.length === 0 ? 0 : displayStart + filteredOrders.length - 1;
  const loadError = error instanceof Error ? error.message : null;

  const handleExportOrders = async (): Promise<Blob> => {
    const header = ['commande', 'date', 'heure', 'client', 'canal', 'statut', 'montant', 'paiement'];
    const rows = filteredOrders.map((order) => [
      order.number,
      order.date,
      order.time,
      order.customer_name,
      CHANNEL_LABELS[order.channel] || order.channel,
      ORDER_STATUS_COLORS[order.status]?.label || order.status,
      order.total.toFixed(2),
      PAYMENT_LABELS[order.payment_method] || order.payment_method,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  };

  const handleDetailOpen = (orderId: string) => {
    setOrderId(orderId);
  };

  return (
    <DashboardLayout>
      <PageContainer
        header={
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Historique des Commandes</h1>
            <p className="text-muted-foreground">Suivi complet des commandes avec filtres et détails</p>
          </div>
        }
      >
        {/* Filtres */}
        <Card className="bg-card border border-border mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Période</label>
                <AdvancedDatePicker 
                  value={{ from: draftStartDate, to: draftEndDate }}
                  onChange={(range) => {
                    setDraftStartDate(range.from);
                    setDraftEndDate(range.to);
                  }}
                />
              </div>
              <div className="lg:col-span-2 lg:max-w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Canal</label>
                <Select value={draftChannel} onValueChange={(v) => setDraftChannel(v)}>
                  <SelectTrigger className="bg-background border border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les canaux</SelectItem>
                    <SelectItem value="ubereats">Uber Eats</SelectItem>
                    <SelectItem value="deliveroo">Deliveroo</SelectItem>
                    <SelectItem value="restaurant">Sur place</SelectItem>
                    <SelectItem value="takeaway">Emporter</SelectItem>
                    <SelectItem value="delivery">Livraison</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2 lg:max-w-[180px]">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Statut</label>
                <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v)}>
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
              <div className="lg:col-span-3">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Recherche</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="N° commande ou client" 
                    className="pl-8"
                    value={draftSearch}
                    onChange={(e) => {
                      setDraftSearch(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="lg:col-span-1">
                <Button onClick={handleApplyFilters} className="w-full">
                  Rechercher
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-primary border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-white">Total commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalOrders}</div>
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
                {(filteredOrders.length === 0 ? 0 : filteredOrders.reduce((sum, o) => sum + o.total, 0) / filteredOrders.length).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau */}
        <Card className="bg-card border border-border mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Commandes ({totalOrders})</CardTitle>
            <ExportButton
              onExport={handleExportOrders}
              filename={`historique-commandes-${startDate.toISOString().split('T')[0]}`}
              isLoading={isFetching}
            />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow className="border-b border-border">
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Chargement de l'historique des commandes...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && loadError && (
                    <TableRow className="border-b border-border">
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-red-600">
                        {loadError}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !loadError && filteredOrders.length === 0 && (
                    <TableRow className="border-b border-border">
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Aucune commande trouvée pour cette période.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !loadError && filteredOrders.map((order) => {
                    const statusConfig = ORDER_STATUS_COLORS[order.status] || ORDER_STATUS_COLORS.pending;
                    const StatusIcon = statusConfig.icon;
                    return (
                    <TableRow 
                      key={order.id} 
                      className="border-b border-border cursor-pointer hover:bg-muted transition"
                      onClick={() => handleDetailOpen(order.id)}
                    >
                      <TableCell className="font-medium">{order.number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.date} {order.time}</TableCell>
                      <TableCell>{order.customer_name?.trim() || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {renderChannelBadge(order.channel)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {order.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {displayStart} à {displayEnd} sur {totalOrders}
          </p>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={currentPage === 1 || isFetching}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
              Page {currentPage} sur {totalPages}
            </span>
            <button 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || isFetching}
              className="p-2 border border-border rounded hover:bg-muted transition disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </PageContainer>

      {/* Detail Modal */}
      <OrderDetailModal 
        isOpen={Boolean(orderId)}
        onClose={clearOrderId}
        orderId={orderId || ''}
      />
    </DashboardLayout>
  );
};

export default DashboardOrderHistory;
