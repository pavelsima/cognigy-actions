import { IMessage } from "../../common/interfaces/message";

const COLLATION_LIMIT = 1000 * 60; // 60 seconds

export interface MessageGroup {
	messages: IMessage[];
	startIndex: number;
}

/**
 * Check if two messages should be collated (grouped together)
 */
const shouldCollate = (message: IMessage, prevMessage?: IMessage): boolean => {
	if (!prevMessage) return false;

	const difference = Number(message?.timestamp) - Number(prevMessage?.timestamp);

	// XAppSubmitMessages should always be collated
	if ((message?.data as any)?._plugin?.type === "x-app-submit") return true;

	return (
		!isNaN(difference) &&
		difference < COLLATION_LIMIT &&
		prevMessage?.source === message?.source
	);
};

/**
 * Group consecutive messages that should be collated together
 */
export const groupMessages = (messages: IMessage[]): MessageGroup[] => {
	if (!messages || messages.length === 0) return [];

	const groups: MessageGroup[] = [];
	let currentGroup: IMessage[] = [];
	let groupStartIndex = 0;

	messages.forEach((message, index) => {
		const prevMessage = index > 0 ? messages[index - 1] : undefined;

		if (shouldCollate(message, prevMessage)) {
			// Add to current group
			currentGroup.push(message);
		} else {
			// Start a new group
			if (currentGroup.length > 0) {
				groups.push({
					messages: currentGroup,
					startIndex: groupStartIndex,
				});
			}
			currentGroup = [message];
			groupStartIndex = index;
		}
	});

	// Don't forget the last group
	if (currentGroup.length > 0) {
		groups.push({
			messages: currentGroup,
			startIndex: groupStartIndex,
		});
	}

	return groups;
};
