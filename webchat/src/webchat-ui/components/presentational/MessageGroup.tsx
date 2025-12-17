import React, { FC, ComponentProps } from "react";
import styled from "@emotion/styled";
import { Message } from "@cognigy/chat-components";
import CustomMessageHeader from "./CustomMessageHeader";
import { IMessage } from "../../../common/interfaces/message";

const GroupWrapper = styled.div<{ isBot: boolean }>(({ isBot }) => ({
	maxWidth: "80%",
	marginLeft: 16,
	marginRight: 16,
	marginTop: 8,
	marginBottom: 8,
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

const HeaderContainer = styled.div(() => ({
	marginBottom: 4,
}));

const MessagesContainer = styled.div<{ isBot: boolean }>(({ isBot }) => ({
	backgroundColor: isBot ? "#F5F8FA" : "#FFFFFF",
	border: "1px solid #D2D8DB",
	borderRadius: 12,
	padding: "12px 16px",
	// Remove default styling from individual message bubbles inside
	"& [class*='_bubble']": {
		border: "none !important",
		background: "transparent !important",
		padding: "0 !important",
		margin: "0 !important",
		boxShadow: "none !important",
		maxWidth: "100% !important",
	},
	"& [class*='_messageRow']": {
		padding: "0 !important",
	},
	// Remove any inner container borders
	"& .webchat-quick-reply-template-root": {
		border: "none !important",
		background: "transparent !important",
		padding: "0 !important",
		margin: "0 !important",
	},
	// Spacing between messages in the group (no separators)
	"& .custom-message-wrapper:not(:last-child)": {
		marginBottom: 8,
	},
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

	// For bot/agent messages, render in grouped container
	return (
		<GroupWrapper isBot={isBot} className="message-group-wrapper">
			<HeaderContainer>
				<CustomMessageHeader
					source={source}
					timestamp={timestamp}
					name={avatarName}
				/>
			</HeaderContainer>
			<MessagesContainer isBot={isBot} className="message-group-container">
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
			</MessagesContainer>
		</GroupWrapper>
	);
};

export default MessageGroup;
