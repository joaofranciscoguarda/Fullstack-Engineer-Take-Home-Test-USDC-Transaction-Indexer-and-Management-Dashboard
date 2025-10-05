import axios, { AxiosError, type AxiosInstance } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
	constructor(public status: number, message: string, public data?: unknown) {
		super(message);
		this.name = "ApiError";
	}
}

/**
 * Axios instance with default configuration
 * - Base URL from environment variable
 * - 30 second timeout
 * - JSON content type
 */
const axiosInstance: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 30000, // 30 seconds
	headers: {
		"Content-Type": "application/json",
	},
});

/**
 * Request interceptor for adding auth headers, logging, etc.
 * Currently just passes through, but can be extended for:
 * - API key authentication
 * - Request logging
 * - Request timing
 */
axiosInstance.interceptors.request.use(
	(config) => {
		// Future: Add API key or auth token here if needed
		// config.headers['X-API-Key'] = 'your-api-key';
		return config;
	},
	(error) => Promise.reject(error)
);

/**
 * Response interceptor for unified error handling
 * Converts axios errors into our custom ApiError class
 */
axiosInstance.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		if (error.response) {
			// Server responded with error status
			throw new ApiError(
				error.response.status,
				`API request failed: ${error.response.statusText}`,
				error.response.data
			);
		} else if (error.request) {
			// Request made but no response received
			throw new ApiError(
				0,
				"No response from server. Please check your connection."
			);
		} else {
			// Something happened in setting up the request
			throw new ApiError(0, error.message || "Request failed");
		}
	}
);

async function fetchApi<T>(endpoint: string): Promise<T> {
	const response = await axiosInstance.get<T>(endpoint);
	return response.data;
}

export const api = {
	// Get balance for an address
	getBalance: async (
		address: string,
		chainId?: number,
		contractAddress?: string
	) => {
		const params = new URLSearchParams();
		if (chainId) params.append("chainId", chainId.toString());
		if (contractAddress) params.append("contractAddress", contractAddress);

		const query = params.toString() ? `?${params.toString()}` : "";
		return fetchApi<BalanceResponse>(`/api/balance/${address}${query}`);
	},

	// Get transfers by address
	getTransfersByAddress: async (
		address: string,
		options?: {
			page?: number;
			limit?: number;
			chainId?: number;
			contractAddress?: string;
		}
	) => {
		const params = new URLSearchParams();
		if (options?.page) params.append("page", options.page.toString());
		if (options?.limit) params.append("limit", options.limit.toString());
		if (options?.chainId) params.append("chainId", options.chainId.toString());
		if (options?.contractAddress)
			params.append("contractAddress", options.contractAddress);

		const query = params.toString() ? `?${params.toString()}` : "";
		return fetchApi<TransferListResponse>(
			`/api/transfers/address/${address}${query}`
		);
	},

	// Get transfer by transaction hash
	getTransferByTxHash: async (txHash: string, chainId?: number) => {
		const params = new URLSearchParams();
		if (chainId) params.append("chainId", chainId.toString());

		const query = params.toString() ? `?${params.toString()}` : "";
		return fetchApi<TransferResponse>(`/api/transfers/${txHash}${query}`);
	},

	// Get all transfers with filters
	getTransfers: async (options?: {
		page?: number;
		limit?: number;
		chainId?: number;
		contractAddress?: string;
		fromBlock?: number;
		toBlock?: number;
	}) => {
		const params = new URLSearchParams();
		if (options?.page) params.append("page", options.page.toString());
		if (options?.limit) params.append("limit", options.limit.toString());
		if (options?.chainId) params.append("chainId", options.chainId.toString());
		if (options?.contractAddress)
			params.append("contractAddress", options.contractAddress);
		if (options?.fromBlock)
			params.append("fromBlock", options.fromBlock.toString());
		if (options?.toBlock) params.append("toBlock", options.toBlock.toString());

		const query = params.toString() ? `?${params.toString()}` : "";
		return fetchApi<TransferListResponse>(`/api/transfers${query}`);
	},
};

// Type definitions based on backend response structures
export interface Transfer {
	id: string;
	tx_hash: string;
	log_index: number;
	block_number: bigint;
	block_hash: string;
	timestamp: Date;
	from_address: string;
	to_address: string;
	amount: bigint;
	contract_id: string;
	contract_address: string;
	chain_id: number;
	gas_price?: bigint | null;
	gas_used?: bigint | null;
	status: number;
	is_confirmed: boolean;
	confirmations: number;
	updated_at?: Date;
}

export type PaginationMetadata = {
	page_number: number;
	page_size: number;
	max_page_number: number;
	total_items: number;
};

export interface TransferListResponse {
	success: boolean;
	data: Transfer[];
	pagination: PaginationMetadata;
	timestamp: string;
}

export interface TransferResponse {
	success: boolean;
	data: Transfer;
	timestamp: string;
}

export interface BalanceResponse {
	success: boolean;
	data: {
		address: string;
		chainId: number;
		contractAddress: string;
		balance: string;
		decimals: number;
		formatted: string;
		lastUpdated: string;
	};
}
