"use client";

import { useState } from "react";
import { WalletSearch } from "@/components/wallet-search";
import { WalletBalance } from "@/components/wallet-balance";
import { BalanceChart } from "@/components/balance-chart";
import { TransferList } from "@/components/transfer-list";
import { TransactionDetails } from "@/components/transaction-details";
import {
	api,
	type BalanceResponse,
	type TransferListResponse,
	type Transfer,
} from "@/lib/api";
import { Search } from "lucide-react";

type ViewMode = "idle" | "wallet" | "transaction";

export default function Home() {
	const [viewMode, setViewMode] = useState<ViewMode>("idle");
	const [searchValue, setSearchValue] = useState("");

	// Wallet state
	const [balance, setBalance] = useState<BalanceResponse | null>(null);
	const [transfers, setTransfers] = useState<TransferListResponse | null>(null);
	const [isLoadingBalance, setIsLoadingBalance] = useState(false);
	const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);

	// Transaction state
	const [transaction, setTransaction] = useState<Transfer | null>(null);
	const [isLoadingTransaction, setIsLoadingTransaction] = useState(false);

	// Error state
	const [error, setError] = useState("");

	const loadWalletData = async (address: string, page: number = 1) => {
		setError("");
		setSearchValue(address);
		setViewMode("wallet");

		// Load balance
		setIsLoadingBalance(true);
		try {
			const balanceData = await api.getBalance(address);
			setBalance(balanceData);
		} catch (err) {
			console.error("Error fetching balance:", err);
			setError("Failed to fetch balance. Please try again.");
			setBalance(null);
		} finally {
			setIsLoadingBalance(false);
		}

		// Load transfers
		setIsLoadingTransfers(true);
		try {
			const transfersData = await api.getTransfersByAddress(address, {
				page,
				limit: 50,
			});
			setTransfers(transfersData);
			setCurrentPage(page);
		} catch (err) {
			console.error("Error fetching transfers:", err);
			setError("Failed to fetch transfers. Please try again.");
			setTransfers(null);
		} finally {
			setIsLoadingTransfers(false);
		}
	};

	const loadTransactionData = async (txHash: string) => {
		setError("");
		setSearchValue(txHash);
		setViewMode("transaction");

		setIsLoadingTransaction(true);
		try {
			const txData = await api.getTransferByTxHash(txHash);
			setTransaction(txData.data);
		} catch (err) {
			console.error("Error fetching transaction:", err);
			setError("Failed to fetch transaction. Please try again.");
			setTransaction(null);
		} finally {
			setIsLoadingTransaction(false);
		}
	};

	const handleSearch = (value: string, type: "address" | "txHash") => {
		if (type === "address") {
			loadWalletData(value, 1);
		} else {
			loadTransactionData(value);
		}
	};

	const handlePageChange = (page: number) => {
		if (viewMode === "wallet" && searchValue) {
			loadWalletData(searchValue, page);
		}
	};

	const isLoading =
		isLoadingBalance || isLoadingTransfers || isLoadingTransaction;

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-2">
						<Search className="h-6 w-6" />
						<h1 className="text-2xl font-bold">Indexer Search</h1>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 py-6 space-y-6">
				{/* Search Section */}
				<div className="max-w-3xl mx-auto">
					<div className="space-y-2 mb-4">
						<h2 className="text-xl font-semibold">Search</h2>
						<p className="text-sm text-muted-foreground">
							Enter an Ethereum address to view wallet info or a transaction
							hash to view transaction details
						</p>
					</div>
					<WalletSearch onSearch={handleSearch} isLoading={isLoading} />
				</div>

				{/* Error Message */}
				{error && (
					<div className="max-w-3xl mx-auto">
						<div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
							<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
						</div>
					</div>
				)}

				{/* Wallet View */}
				{viewMode === "wallet" && (
					<div className="max-w-3xl mx-auto space-y-6">
						<WalletBalance
							balance={balance}
							isLoading={isLoadingBalance}
							address={searchValue}
						/>
						<BalanceChart walletAddress={searchValue} chainId={1} />
						<TransferList
							transfers={transfers?.data || []}
							isLoading={isLoadingTransfers}
							walletAddress={searchValue}
							pagination={transfers?.pagination}
							onPageChange={handlePageChange}
						/>
					</div>
				)}

				{/* Transaction View */}
				{viewMode === "transaction" && (
					<div className="max-w-3xl mx-auto">
						<TransactionDetails
							transaction={transaction}
							isLoading={isLoadingTransaction}
							txHash={searchValue}
						/>
					</div>
				)}

				{/* Empty State */}
				{viewMode === "idle" && (
					<div className="max-w-3xl mx-auto">
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Search className="h-16 w-16 text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold mb-2">Start Searching</h3>
							<p className="text-sm text-muted-foreground max-w-md">
								Enter an Ethereum address (40 hex characters) to view wallet
								information, or a transaction hash (64 hex characters) to view
								transaction details.
							</p>
						</div>
					</div>
				)}
			</main>

			{/* Footer */}
			<footer className="border-t mt-12">
				<div className="container mx-auto px-4 py-6">
					<p className="text-sm text-muted-foreground text-center">
						USDC Transaction Indexer Dashboard
					</p>
				</div>
			</footer>
		</div>
	);
}
