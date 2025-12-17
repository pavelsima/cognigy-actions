import React, { FC, useMemo } from "react";
import styled from "@emotion/styled";
import { MessageComponentProps } from "../../common/interfaces/message-plugin";
import CustomActionButtons, { Button } from "./CustomActionButtons";
import { sanitizeHTML } from "../../webchat/helper/sanitize";

const Container = styled.div(() => ({
	width: "100%",
}));

const TextContent = styled.div(() => ({
	fontSize: 14,
	lineHeight: 1.6,
	color: "#1F2937",
	"& p": {
		margin: 0,
	},
	"& strong, & b": {
		fontWeight: 600,
		color: "#111827",
	},
	"& a": {
		color: "#0C3985",
		textDecoration: "none",
		"&:hover": {
			textDecoration: "underline",
		},
	},
	"& ul, & ol": {
		paddingLeft: 20,
		margin: "8px 0",
	},
	"& li": {
		marginBottom: 4,
	},
}));

/**
 * Get channel payload from message (webchat or facebook format)
 */
const getChannelPayload = (message: MessageComponentProps["message"], config?: MessageComponentProps["config"]) => {
	const { _facebook, _webchat, _defaultPreview } = (message?.data?._cognigy as any) || {};

	const defaultPreviewEnabled = config?.settings?.widgetSettings?.enableDefaultPreview;

	if (defaultPreviewEnabled && _defaultPreview) {
		return _defaultPreview;
	}

	if (
		config?.settings?.widgetSettings?.enableStrictMessengerSync &&
		(message.data?._cognigy as any)?.syncWebchatWithFacebook
	) {
		return _facebook;
	}

	return _webchat || _facebook;
};

const CustomTextWithButtons: FC<MessageComponentProps> = (props) => {
	const { message, config, onSendMessage, onEmitAnalytics } = props;

	const payload = getChannelPayload(message, config);

	const attachment = payload?.message?.attachment;
	const text = attachment?.payload?.text || payload?.message?.text || message.text || "";

	const buttons: Button[] = useMemo(() => {
		const payloadButtons = attachment?.payload?.buttons || payload?.message?.quick_replies || [];
		return payloadButtons.filter((button: Button) => {
			if (button.type && !["postback", "web_url", "phone_number", "openXApp"].includes(button.type)) {
				return false;
			}
			return true;
		});
	}, [attachment?.payload?.buttons, payload?.message?.quick_replies]);

	const isSanitizeEnabled = !config?.settings?.layout?.disableHtmlContentSanitization;
	const sanitizedText = isSanitizeEnabled ? sanitizeHTML(text) : text;

	const handleAction = (text?: string, data?: any) => {
		onSendMessage(text || "", data);
	};

	return (
		<Container className="custom-text-with-buttons">
			{sanitizedText && (
				<TextContent
					className="custom-text-with-buttons-text"
					dangerouslySetInnerHTML={{ __html: sanitizedText }}
				/>
			)}
			<CustomActionButtons
				buttons={buttons}
				onAction={handleAction}
				onEmitAnalytics={onEmitAnalytics}
			/>
		</Container>
	);
};

export default CustomTextWithButtons;
