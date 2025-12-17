import React, { FC, ComponentProps } from "react";
import styled from "@emotion/styled";
import { Message } from "@cognigy/chat-components";
import CustomMessageHeader from "./CustomMessageHeader";
import { IMessage } from "../../../common/interfaces/message";

const GroupWrapper = styled.div<{ isBot: boolean }>(({ isBot }) => ({
	maxWidth: "85%",
	marginLeft: 12,
	marginRight: 12,
	marginTop: 6,
	marginBottom: 6,
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
		paddingLeft: "0 !important",
		paddingRight: "0 !important",
	},
}));

const MessagesContainer = styled.div<{ isBot: boolean }>(({ isBot }) => ({
	backgroundColor: isBot ? "#F5F8FA" : "#FFFFFF",
	border: "1px solid #D2D8DB",
	borderRadius: 12,
	padding: "12px 16px",

	// Enforce consistent font size across all message types
	fontSize: "16px",
	lineHeight: "1.5",

	// Remove default styling from individual message bubbles inside (chat-components)
	"& [class*='_bubble']": {
		border: "none !important",
		background: "transparent !important",
		padding: "0 !important",
		margin: "0 !important",
		boxShadow: "none !important",
		maxWidth: "100% !important",
		fontSize: "inherit !important",
	},
	// More specific selector for chat-bubble class
	"& .chat-bubble, & [class*='chat-bubble']": {
		padding: "0 !important",
		margin: "0 !important",
		border: "none !important",
		background: "transparent !important",
		boxShadow: "none !important",
		fontSize: "inherit !important",
	},
	"& [class*='_messageRow']": {
		padding: "0 !important",
		margin: "0 !important",
	},
	"& [class*='_content']": {
		padding: "0 !important",
		margin: "0 !important",
	},
	// Target incoming/outgoing bubble variants
	"& [class*='_incoming'], & [class*='_outgoing']": {
		padding: "0 !important",
		margin: "0 !important",
	},

	// Reset all inner plugin containers
	"& .webchat-quick-reply-template-root, & .webchat-buttons-template-root, & .custom-text-with-buttons": {
		border: "none !important",
		background: "transparent !important",
		padding: "0 !important",
		margin: "0 !important",
	},

	// Text message spacing
	"& [class*='_text'], & .webchat-message-row, & .custom-text-with-buttons-text": {
		padding: "0 !important",
		margin: "0 !important",
	},
	"& p": {
		margin: "0 0 4px 0 !important",
		"&:last-child": {
			marginBottom: "0 !important",
		},
	},

	// Spacing between messages in the group
	"& .custom-message-wrapper + .custom-message-wrapper": {
		marginTop: 16,
	},

	// Override any nested divs padding and ensure consistent font
	"& div[class*='_']": {
		padding: "0 !important",
		fontSize: "inherit !important",
	},

	// Ensure all text elements inherit font size
	"& span, & div, & p": {
		fontSize: "inherit",
	},
}));

const TimestampFooter = styled.time(() => ({
	display: "block",
	fontSize: 11,
	color: "#9CA3AF",
	marginTop: 8,
	textAlign: "right",
}));

const SingleMessageWrapper = styled.div(() => ({
	maxWidth: "80%",
	marginLeft: "auto",
	// Hide the original message header
	"& .message-header": {
		display: "none !important",
	},
	// Hide the original avatar
	"& [class*='_avatar']": {
		display: "none !important",
	},
	"& [class*='_messageRow']": {
		paddingLeft: "16px !important",
		paddingRight: "16px !important",
	},
}));

type MessageProps = ComponentProps<typeof Message>;

export interface MessageGroupProps {
	messages: IMessage[];
	messageProps: Omit<MessageProps, 'message' | 'prevMessage'>;
	allMessages: IMessage[];
	startIndex: number;
}

const MessageGroup: FC<MessageGroupProps> = ({ messages, messageProps, allMessages, startIndex }) => {
	const firstMessage = messages[0];
	const source = firstMessage?.source || "bot";
	const timestamp = firstMessage?.timestamp ? Number(firstMessage.timestamp) : Date.now();
	const avatarName = firstMessage?.avatarName;
	const isBot = source === "bot" || source === "agent" || source === "engagement";
	const isUser = source === "user";

	// For user messages, render without grouping container
	if (isUser) {
		return (
			<>
				{messages.map((message, idx) => {
					const globalIndex = startIndex + idx;
					const prevMessage = globalIndex > 0 ? allMessages[globalIndex - 1] : undefined;
					return (
						<SingleMessageWrapper key={message.id || `msg-${globalIndex}`} className="custom-message-wrapper">
							<Message
								message={message}
								prevMessage={prevMessage}
								{...messageProps}
							/>
						</SingleMessageWrapper>
					);
				})}
			</>
		);
	}

	const formattedTime = new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});

	// For bot/agent messages, render in grouped container
	return (
		<GroupWrapper isBot={isBot} className="message-group-wrapper">
			<MessagesContainer isBot={isBot} className="message-group-container">
				<CustomMessageHeader
					source={source}
					name={avatarName}
				/>
				{messages.map((message, idx) => {
					const globalIndex = startIndex + idx;
					const prevMessage = globalIndex > 0 ? allMessages[globalIndex - 1] : undefined;
					return (
						<div key={message.id || `msg-${globalIndex}`} className="custom-message-wrapper">
							<Message
								message={message}
								prevMessage={prevMessage}
								{...messageProps}
							/>
						</div>
					);
				})}
				<TimestampFooter className="message-group-timestamp">
					{formattedTime}
				</TimestampFooter>
			</MessagesContainer>
		</GroupWrapper>
	);
};

export default MessageGroup;
