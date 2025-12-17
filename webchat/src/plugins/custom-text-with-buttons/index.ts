import { MessagePlugin } from "../../common/interfaces/message-plugin";
import CustomTextWithButtons from "./CustomTextWithButtons";

/**
 * Get channel payload from message (webchat or facebook format)
 */
const getChannelPayload = (message: any, config?: any) => {
	const { _facebook, _webchat, _defaultPreview } = message?.data?._cognigy || {};

	const defaultPreviewEnabled = config?.settings?.widgetSettings?.enableDefaultPreview;

	if (defaultPreviewEnabled && _defaultPreview) {
		return _defaultPreview;
	}

	if (
		config?.settings?.widgetSettings?.enableStrictMessengerSync &&
		message.data?._cognigy?.syncWebchatWithFacebook
	) {
		return _facebook;
	}

	return _webchat || _facebook;
};

/**
 * Custom Text with Buttons plugin
 * Replaces the default TextWithButtons component from @cognigy/chat-components
 */
const customTextWithButtonsPlugin: MessagePlugin = {
	name: "custom-text-with-buttons",
	match: (message, config) => {
		const channelConfig = getChannelPayload(message, config);
		if (!channelConfig) return false;

		const isQuickReplies =
			channelConfig?.message?.quick_replies &&
			channelConfig.message.quick_replies.length > 0;

		const isTextWithButtons =
			channelConfig?.message?.attachment?.payload?.template_type === "button";

		const hasMessengerText = channelConfig?.message?.text;

		const isDefaultPreviewEnabled = config?.settings?.widgetSettings?.enableDefaultPreview;
		const hasDefaultPreview = message?.data?._cognigy?._defaultPreview;
		const shouldSkip = isDefaultPreviewEnabled && !hasDefaultPreview && message.text;

		return !shouldSkip && (isQuickReplies || isTextWithButtons || !!hasMessengerText);
	},
	component: CustomTextWithButtons,
};

export default customTextWithButtonsPlugin;
