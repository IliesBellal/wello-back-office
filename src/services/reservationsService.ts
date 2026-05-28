export type ReservationStatus = 'confirmed' | 'pending' | 'seated' | 'cancelled';
export type ReservationSource = 'telephone' | 'site' | 'google' | 'walk-in';

export interface Reservation {
  id: string;
  guestName: string;
  phone: string;
  email: string;
  reservedAt: string;
  partySize: number;
  tableName: string;
  status: ReservationStatus;
  source: ReservationSource;
  specialRequest?: string;
  createdAt: string;
}

export interface ReservationListMetadata {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export type ReservationSortField = 'guest_name' | 'reserved_at' | 'party_size' | 'status' | 'source';
export type ReservationSortDirection = 'asc' | 'desc';

interface ReservationSortOptions {
  sortField: ReservationSortField;
  sortDir: ReservationSortDirection;
}

export interface ReservationSettings {
  autoConfirmOnline: boolean;
  sendSmsReminders: boolean;
  sendEmailReminders: boolean;
  enableWaitlist: boolean;
  allowWalkInsOnFullService: boolean;
  collectDeposit: boolean;
  bookingWindowDays: number;
  maxPartySize: number;
  defaultDurationMinutes: number;
  slotIntervalMinutes: number;
  reminderLeadHours: number;
  depositAmount: number;
  welcomeNote: string;
}

export interface ReservationServiceWindow {
  id: string;
  label: string;
  firstBookingTime: string;
  lastBookingTime: string;
  maxCovers: number;
  channel: 'all' | 'online' | 'manual';
  enabled: boolean;
}

export interface ReservationArea {
  id: string;
  name: string;
  capacity: number;
  turnDurationMinutes: number;
  enabled: boolean;
}

const wait = async (ms: number = 150): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const mockReservations: Reservation[] = [
  {
    id: 'res-001',
    guestName: 'Claire Martin',
    phone: '06 12 45 78 90',
    email: 'claire.martin@example.com',
    reservedAt: '2026-05-28T12:30:00.000Z',
    partySize: 2,
    tableName: 'Terrasse 4',
    status: 'confirmed',
    source: 'site',
    specialRequest: 'Chaise bebe',
    createdAt: '2026-05-24T08:15:00.000Z',
  },
  {
    id: 'res-002',
    guestName: 'Karim Benali',
    phone: '07 81 22 19 44',
    email: 'karim.benali@example.com',
    reservedAt: '2026-05-28T18:45:00.000Z',
    partySize: 5,
    tableName: 'Salle 7',
    status: 'pending',
    source: 'google',
    specialRequest: 'Anniversaire',
    createdAt: '2026-05-27T09:40:00.000Z',
  },
  {
    id: 'res-003',
    guestName: 'Sophie Laurent',
    phone: '06 55 44 32 10',
    email: 'sophie.laurent@example.com',
    reservedAt: '2026-05-28T19:15:00.000Z',
    partySize: 3,
    tableName: 'Comptoir 2',
    status: 'seated',
    source: 'telephone',
    createdAt: '2026-05-26T16:20:00.000Z',
  },
  {
    id: 'res-004',
    guestName: 'Nathan Petit',
    phone: '06 79 18 74 52',
    email: 'nathan.petit@example.com',
    reservedAt: '2026-05-29T12:00:00.000Z',
    partySize: 6,
    tableName: 'Grande table 1',
    status: 'confirmed',
    source: 'site',
    specialRequest: 'Vue fenetre',
    createdAt: '2026-05-20T10:05:00.000Z',
  },
  {
    id: 'res-005',
    guestName: 'Ines Richard',
    phone: '06 84 91 23 65',
    email: 'ines.richard@example.com',
    reservedAt: '2026-05-29T19:30:00.000Z',
    partySize: 4,
    tableName: 'Salle 3',
    status: 'cancelled',
    source: 'site',
    createdAt: '2026-05-18T15:30:00.000Z',
  },
  {
    id: 'res-006',
    guestName: 'Julien Moreau',
    phone: '07 67 19 56 21',
    email: 'julien.moreau@example.com',
    reservedAt: '2026-05-30T11:45:00.000Z',
    partySize: 2,
    tableName: 'Terrasse 1',
    status: 'confirmed',
    source: 'walk-in',
    specialRequest: 'Pres de l entree',
    createdAt: '2026-05-28T11:10:00.000Z',
  },
  {
    id: 'res-007',
    guestName: 'Sarah Dubois',
    phone: '06 44 18 77 31',
    email: 'sarah.dubois@example.com',
    reservedAt: '2026-05-30T20:00:00.000Z',
    partySize: 8,
    tableName: 'Privatif',
    status: 'pending',
    source: 'telephone',
    specialRequest: 'Menu vegetarien',
    createdAt: '2026-05-27T12:50:00.000Z',
  },
  {
    id: 'res-008',
    guestName: 'Lucas Garnier',
    phone: '07 41 65 90 18',
    email: 'lucas.garnier@example.com',
    reservedAt: '2026-05-31T12:15:00.000Z',
    partySize: 2,
    tableName: 'Salle 5',
    status: 'confirmed',
    source: 'google',
    createdAt: '2026-05-26T18:00:00.000Z',
  },
  {
    id: 'res-009',
    guestName: 'Emma Bernard',
    phone: '06 72 89 12 54',
    email: 'emma.bernard@example.com',
    reservedAt: '2026-05-31T19:45:00.000Z',
    partySize: 4,
    tableName: 'Terrasse 6',
    status: 'confirmed',
    source: 'site',
    specialRequest: 'Sans gluten',
    createdAt: '2026-05-25T13:25:00.000Z',
  },
  {
    id: 'res-010',
    guestName: 'Antoine Lefevre',
    phone: '06 93 58 21 07',
    email: 'antoine.lefevre@example.com',
    reservedAt: '2026-06-01T12:00:00.000Z',
    partySize: 3,
    tableName: 'Salle 2',
    status: 'pending',
    source: 'site',
    createdAt: '2026-05-28T07:55:00.000Z',
  },
  {
    id: 'res-011',
    guestName: 'Lea Roussel',
    phone: '07 88 14 20 63',
    email: 'lea.roussel@example.com',
    reservedAt: '2026-06-01T20:15:00.000Z',
    partySize: 6,
    tableName: 'Mezzanine 1',
    status: 'confirmed',
    source: 'google',
    specialRequest: 'Allergie fruits de mer',
    createdAt: '2026-05-23T17:35:00.000Z',
  },
  {
    id: 'res-012',
    guestName: 'Paul Henry',
    phone: '06 17 39 88 42',
    email: 'paul.henry@example.com',
    reservedAt: '2026-06-02T18:30:00.000Z',
    partySize: 2,
    tableName: 'Comptoir 1',
    status: 'seated',
    source: 'telephone',
    createdAt: '2026-05-22T14:12:00.000Z',
  },
];

let reservationSettings: ReservationSettings = {
  autoConfirmOnline: false,
  sendSmsReminders: true,
  sendEmailReminders: true,
  enableWaitlist: true,
  allowWalkInsOnFullService: false,
  collectDeposit: true,
  bookingWindowDays: 30,
  maxPartySize: 8,
  defaultDurationMinutes: 90,
  slotIntervalMinutes: 15,
  reminderLeadHours: 24,
  depositAmount: 15,
  welcomeNote: 'Confirmer les groupes de plus de 6 couverts par telephone avant ouverture du service.',
};

const reservationServiceWindows: ReservationServiceWindow[] = [
  {
    id: 'window-lunch',
    label: 'Service midi',
    firstBookingTime: '12:00',
    lastBookingTime: '14:15',
    maxCovers: 42,
    channel: 'all',
    enabled: true,
  },
  {
    id: 'window-dinner',
    label: 'Service soir',
    firstBookingTime: '19:00',
    lastBookingTime: '22:00',
    maxCovers: 58,
    channel: 'all',
    enabled: true,
  },
  {
    id: 'window-brunch',
    label: 'Brunch week-end',
    firstBookingTime: '11:00',
    lastBookingTime: '13:30',
    maxCovers: 28,
    channel: 'online',
    enabled: false,
  },
];

const reservationAreas: ReservationArea[] = [
  {
    id: 'area-main',
    name: 'Salle principale',
    capacity: 34,
    turnDurationMinutes: 90,
    enabled: true,
  },
  {
    id: 'area-terrace',
    name: 'Terrasse',
    capacity: 20,
    turnDurationMinutes: 75,
    enabled: true,
  },
  {
    id: 'area-private',
    name: 'Salon privatif',
    capacity: 12,
    turnDurationMinutes: 120,
    enabled: false,
  },
];

const statusOrder: Record<ReservationStatus, number> = {
  pending: 0,
  confirmed: 1,
  seated: 2,
  cancelled: 3,
};

const sourceOrder: Record<ReservationSource, number> = {
  telephone: 0,
  site: 1,
  google: 2,
  'walk-in': 3,
};

const cloneSettings = (settings: ReservationSettings): ReservationSettings => ({
  ...settings,
});

const cloneServiceWindows = (windows: ReservationServiceWindow[]): ReservationServiceWindow[] => windows.map((window) => ({
  ...window,
}));

const cloneAreas = (areas: ReservationArea[]): ReservationArea[] => areas.map((area) => ({
  ...area,
}));

const compareText = (left: string, right: string): number => left.localeCompare(right, 'fr', { sensitivity: 'base' });

const sortReservations = (
  items: Reservation[],
  sort?: ReservationSortOptions,
): Reservation[] => {
  if (!sort) {
    return [...items];
  }

  const sorted = [...items].sort((left, right) => {
    let result = 0;

    switch (sort.sortField) {
      case 'guest_name':
        result = compareText(left.guestName, right.guestName);
        break;
      case 'reserved_at':
        result = new Date(left.reservedAt).getTime() - new Date(right.reservedAt).getTime();
        break;
      case 'party_size':
        result = left.partySize - right.partySize;
        break;
      case 'status':
        result = statusOrder[left.status] - statusOrder[right.status];
        break;
      case 'source':
        result = sourceOrder[left.source] - sourceOrder[right.source];
        break;
      default:
        result = 0;
    }

    return sort.sortDir === 'asc' ? result : -result;
  });

  return sorted;
};

export const getReservationsList = async (
  page: number = 1,
  limit: number = 10,
  sort?: ReservationSortOptions,
): Promise<{ data: Reservation[]; metadata: ReservationListMetadata }> => {
  await wait();

  const sorted = sortReservations(mockReservations, sort);
  const offset = (page - 1) * limit;
  const data = sorted.slice(offset, offset + limit);
  const totalItems = sorted.length;

  return {
    data,
    metadata: {
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      currentPage: page,
      limit,
    },
  };
};

export const searchReservations = async (
  term: string,
  sort?: ReservationSortOptions,
): Promise<Reservation[]> => {
  await wait();

  const normalizedTerm = term.trim().toLocaleLowerCase();
  const filtered = mockReservations.filter((reservation) => {
    const haystack = [
      reservation.guestName,
      reservation.phone,
      reservation.email,
      reservation.tableName,
      reservation.status,
      reservation.source,
      reservation.specialRequest || '',
    ]
      .join(' ')
      .toLocaleLowerCase();

    return haystack.includes(normalizedTerm);
  });

  return sortReservations(filtered, sort);
};

export const getReservationSettings = async (): Promise<ReservationSettings> => {
  await wait();
  return cloneSettings(reservationSettings);
};

export const updateReservationSettings = async (
  nextSettings: ReservationSettings,
): Promise<ReservationSettings> => {
  await wait();
  reservationSettings = cloneSettings(nextSettings);
  return cloneSettings(reservationSettings);
};

export const getReservationServiceWindows = async (): Promise<ReservationServiceWindow[]> => {
  await wait();
  return cloneServiceWindows(reservationServiceWindows);
};

export const getReservationAreas = async (): Promise<ReservationArea[]> => {
  await wait();
  return cloneAreas(reservationAreas);
};