import {
	formatUnits,
	parseUnits,
	isAddress,
	formatEther,
	parseEther,
	isHash,
} from "viem";

// Re-export viem utilities directly
export { isAddress, isHash, formatEther, parseEther };

/**
 * Determine the type of search input
 */
export function getSearchInputType(
	input: string
): "address" | "txHash" | "invalid" {
	if (isAddress(input)) return "address";
	if (isHash(input) && input.length === 66) return "txHash";
	return "invalid";
}

/**
 * Format USDC amount (6 decimals) - convenience wrapper around formatUnits
 */
export function formatUSDC(value: string | number | bigint): string {
	try {
		const amount = typeof value === "bigint" ? value : BigInt(value);
		return formatUnits(amount, 6);
	} catch (error) {
		console.error("Error formatting USDC:", error);
		return "0";
	}
}

/**
 * Parse USDC amount (6 decimals) - convenience wrapper around parseUnits
 */
export function parseUSDC(value: string): bigint {
	try {
		return parseUnits(value, 6);
	} catch (error) {
		console.error("Error parsing USDC:", error);
		return BigInt(0);
	}
}

/**
 * Format address to shortened version (0x1234...5678)
 */
export function formatAddress(address: string, chars = 4): string {
	if (!address) return "";
	if (address.length <= chars * 2 + 2) return address;
	return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format timestamp to human readable date
 */
export function formatDate(timestamp: string | Date): string {
	const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string | Date): string {
	const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 0) return "just now";
	if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 30) return `${diffInDays}d ago`;

	const diffInMonths = Math.floor(diffInDays / 30);
	if (diffInMonths < 12) return `${diffInMonths}mo ago`;

	const diffInYears = Math.floor(diffInDays / 365);
	return `${diffInYears}y ago`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (error) {
		console.error("Failed to copy:", error);
		return false;
	}
}

/**
 * Get Etherscan link for address or transaction
 */
export function getEtherscanLink(
	type: "address" | "tx",
	value: string,
	chainId: number = 1
): string {
	const baseUrls: Record<number, string> = {
		1: "https://etherscan.io",
		11155111: "https://sepolia.etherscan.io",
	};

	const baseUrl = baseUrls[chainId] || baseUrls[1];
	return `${baseUrl}/${type}/${value}`;
}
