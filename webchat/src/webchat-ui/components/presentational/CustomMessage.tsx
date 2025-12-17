import React, { FC, ComponentProps } from "react";
import styled from "@emotion/styled";
import { Message } from "@cognigy/chat-components";
import CustomMessageHeader from "./CustomMessageHeader";
import { IMessage } from "../../../common/interfaces/message";

const COLLATION_LIMIT = 1000 * 60; // 60 seconds

const MessageWrapper = styled.div(() => ({
	// Hide the original message header from @cognigy/chat-components
	"& .message-header": {
		display: "none !important",
	},
	// Hide the original avatar since we have our own in the header
	"& [class*='_avatar']": {
		display: "none !important",
	},
	// Adjust message row padding since we removed the avatar
	"& [class*='_messageRow']": {
		paddingLeft: "16px !important",
	},
}));

const HeaderContainer = styled.div(() => ({
	paddingLeft: 16,
	paddingRight: 16,
}));

/**
 * Check if message should be collated with previous message
 * (same source, within 60 seconds)
 */
const isMessageCollatable = (message: IMessage, prevMessage?: IMessage): boolean => {
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

type MessageProps = ComponentProps<typeof Message>;

interface CustomMessageProps extends MessageProps {}

const CustomMessage: FC<CustomMessageProps> = (props) => {
	const { message, prevMessage, ...rest } = props;
	const source = message?.source || "bot";
	const timestamp = message?.timestamp ? Number(message.timestamp) : Date.now();
	const avatarName = message?.avatarName;

	// Check if this message should be collated (grouped) with previous
	const shouldCollate = isMessageCollatable(message, prevMessage);

	// Only show header for non-user messages that are NOT collated
	const showHeader = source !== "user" && !shouldCollate;

	return (
		<MessageWrapper className="custom-message-wrapper">
			{showHeader && (
				<HeaderContainer>
					<CustomMessageHeader
						source={source}
						timestamp={timestamp}
						name={avatarName}
					/>
				</HeaderContainer>
			)}
			<Message message={message} prevMessage={prevMessage} {...rest} />
		</MessageWrapper>
	);
};

export default CustomMessage;
