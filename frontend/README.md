# USDC Wallet Explorer - Frontend

A mobile-first Next.js 14 application for exploring USDC wallet balances and transaction history on Ethereum.

## Features

- **Wallet Search**: Search for any Ethereum address to view USDC data
- **Balance Display**: View real-time USDC balance for any address
- **Transaction History**: Browse paginated transfer history (sent and received)
- **Mobile-First Design**: Optimized for mobile devices with responsive desktop layout
- **Etherscan Integration**: Direct links to view addresses and transactions on Etherscan

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Shadcn UI** - Beautiful, accessible component library
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Modern icon library

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:8080` (or configure `NEXT_PUBLIC_API_URL`)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (wallet explorer)
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── wallet-search.tsx # Address search input
│   ├── wallet-balance.tsx # Balance display card
│   └── transfer-list.tsx  # Transaction history list
└── lib/                   # Utilities
    ├── api.ts            # API client
    ├── formatters.ts     # Formatting utilities
    └── utils.ts          # General utilities
```

## API Integration

The frontend connects to the backend API with the following endpoints:

- `GET /api/balance/:address` - Get USDC balance
- `GET /api/transfers/address/:address` - Get transfer history
- `GET /api/transfers/:txHash` - Get specific transaction
- `GET /api/transfers` - List all transfers

## Components

### WalletSearch

Address input with validation. Ensures valid Ethereum addresses before searching.

### WalletBalance

Displays USDC balance with:

- Formatted address with copy button
- Link to Etherscan
- Chain information
- Last update timestamp

### TransferList

Paginated transaction history showing:

- Incoming/outgoing transfers with color coding
- Amount, timestamp, block number
- Links to Etherscan for each transaction
- Pagination controls

## Utilities

### Formatters (`lib/formatters.ts`)

- `formatUSDC()` - Convert USDC smallest units to human readable
- `formatAddress()` - Shorten addresses (0x1234...5678)
- `formatDate()` - Format timestamps
- `formatRelativeTime()` - "2 hours ago" style
- `isValidAddress()` - Validate Ethereum addresses
- `getEtherscanLink()` - Generate Etherscan URLs

### API Client (`lib/api.ts`)

Type-safe API client with TypeScript interfaces matching backend responses.

## Mobile-First Design

The interface is optimized for mobile devices:

- Touch-friendly button sizes
- Responsive grid layouts
- Readable font sizes
- Collapsible transaction cards
- Optimized for small screens first

## Building for Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Future Enhancements

Based on the full dashboard requirements, future pages will include:

1. **Dashboard Overview** - Real-time indexer monitoring
2. **Indexer Management** - Start/stop controls, configuration
3. **Analytics & Reporting** - Charts, statistics, trends
4. **Advanced Filtering** - Date ranges, amount filters, export functionality
