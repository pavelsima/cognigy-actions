import React, { RefObject, useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import CloseIcon from "../../assets/close-16px.svg";
import PixieDustIcon from "../../../assets/icons/pixie_dust.svg";
import SendIconSvg from "../../../assets/icons/send.svg";
import { IWebchatConfig } from "../../../common/interfaces/webchat-config";
import IconButton from "./IconButton";
import Branding from "../branding/Branding";
import Notifications from "./Notifications";
import { WebchatUIProps } from "../WebchatUI";
import { IWebchatButton } from "@cognigy/socket-client";
import getKeyboardFocusableElements from "../../utils/find-focusable";

const HomeScreenRoot = styled.div(({ theme }) => ({
	display: "flex",
	position: "absolute",
	top: 0,
	flexDirection: "column",
	height: "100%",
	width: "100%",
	color: theme.primaryContrastColor,
	fontSize: 16,
	fontWeight: 700,
	boxSizing: "border-box",
	backgroundColor: "#FFFFFF",

	"& *": {
		boxSizing: "border-box",
	},
}));

const HomeScreenHeader = styled.div({
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "flex-end",
	width: "100%",
	padding: "12px 16px",
	borderBottom: "1px solid #E5E7EB",
});

const HomeScreenHeaderIconButton = styled(IconButton)(({ theme }) => ({
	color: "#6B7280",
	borderRadius: 4,
	padding: 4,
	svg: {
		fill: "#6B7280",
		width: 16,
		height: 16,
	},
	"&:hover": {
		backgroundColor: "#F3F4F6",
	},
	"&:focus-visible": {
		outline: `2px solid ${theme.primaryColor}`,
		outlineOffset: 2,
	},
}));

const HomeScreenContent = styled.div({
	flexGrow: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	padding: "40px 24px 24px 24px",
	overflowY: "auto",
});

// CXone: Centered welcome section wrapper
const WelcomeSection = styled.div({
	flex: 1,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
});

const IconWrapper = styled.div({
	marginBottom: 24,
});

const WelcomeTitle = styled.h2({
	fontSize: 24,
	fontWeight: 600,
	color: "#1F2937",
	margin: 0,
	marginBottom: 8,
	textAlign: "center",
});

const WelcomeSubtitle = styled.p({
	fontSize: 16,
	fontWeight: 400,
	color: "#6B7280",
	margin: 0,
	marginBottom: 32,
	textAlign: "center",
});

const SuggestionsSection = styled.div({
	width: "100%",
	maxWidth: 500,
});

const SuggestionsLabel = styled.p({
	fontSize: 14,
	fontWeight: 400,
	color: "#6B7280",
	margin: 0,
	marginBottom: 16,
});

const SuggestionCard = styled.button(({ theme }) => ({
	display: "block",
	width: "100%",
	padding: "14px 16px",
	marginBottom: 12,
	backgroundColor: "#FFFFFF",
	border: "1px solid #D1D5DB",
	borderRadius: 8,
	textAlign: "left",
	fontSize: 14,
	fontWeight: 400,
	color: "#1F2937",
	cursor: "pointer",
	transition: "border-color 0.2s, background-color 0.2s",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",

	"&:hover": {
		borderColor: theme.primaryColor || "#0C3985",
		backgroundColor: "#F9FAFB",
	},

	"&:focus-visible": {
		outline: `2px solid ${theme.primaryColor || "#0C3985"}`,
		outlineOffset: 2,
	},
}));

const FullWidthContainer = styled.div(() => ({
	width: "100%",
	maxWidth: 500,
}));

const InputSection = styled.div({
	padding: "16px 24px",
	borderTop: "1px solid #E5E7EB",
	backgroundColor: "#FFFFFF",
});

// CXone: Form container for input + send button
const InputFormContainer = styled.div({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

// CXone: Bordered input field container with pixie dust icon (matches BaseInput)
const InputWrapper = styled.div(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	flex: 1,
	padding: "8px 12px",
	border: "1px solid #D1D5DB",
	borderRadius: 8,
	backgroundColor: "#FFFFFF",
	transition: "border-color 0.2s",
	gap: 8,

	"&:focus-within": {
		borderColor: theme.primaryColor || "#0C3985",
	},
}));

const StyledInput = styled.input({
	flex: 1,
	border: "none",
	outline: "none",
	fontSize: 14,
	color: "#1F2937",
	backgroundColor: "transparent",

	"&::placeholder": {
		color: "#9CA3AF",
	},
});

const SparkleButton = styled.button(({ theme }) => ({
	background: "none",
	border: "none",
	padding: 4,
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	color: theme.primaryColor || "#0C3985",
	flexShrink: 0,

	"&:hover": {
		color: "#2563EB",
	},

	svg: {
		width: 20,
		height: 20,
	},
}));

// CXone: Send button in separate bordered box (matches BaseInput)
const SendButton = styled.button(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	width: 44,
	height: 44,
	padding: 0,
	border: "1px solid #D1D5DB",
	borderRadius: 8,
	backgroundColor: "#FFFFFF",
	cursor: "pointer",
	transition: "all 0.2s",
	flexShrink: 0,
	color: "#9CA3AF",

	"&:hover:not(:disabled)": {
		borderColor: theme.primaryColor || "#0C3985",
		color: theme.primaryColor || "#0C3985",
	},

	"&:disabled": {
		cursor: "not-allowed",
		color: "#D1D5DB",
	},

	svg: {
		width: 16,
		height: 16,
	},
}));

// Styled pixie dust icon for header
const StyledPixieDustIcon = styled(PixieDustIcon)({
	width: 48,
	height: 48,
	color: "#0C3985",
});

// Styled pixie dust icon for input (smaller)
const SmallPixieDustIcon = styled(PixieDustIcon)({
	width: 20,
	height: 20,
});

// Styled send icon
const StyledSendIcon = styled(SendIconSvg)({
	width: 16,
	height: 16,
});

interface IHomeScreenProps {
	config: IWebchatConfig;
	showHomeScreen: boolean;
	closeButtonRef: RefObject<HTMLButtonElement>;
	onSetShowHomeScreen: (show: boolean) => void;
	onSetShowPrevConversations: (show: boolean) => void;
	onClose: () => void;
	onEmitAnalytics: WebchatUIProps["onEmitAnalytics"];
	onSendActionButtonMessage: WebchatUIProps["onSendMessage"];
	onStartConversation: () => void;
}

export const HomeScreen: React.FC<IHomeScreenProps> = props => {
	const {
		config,
		showHomeScreen,
		closeButtonRef,
		onClose,
		onEmitAnalytics,
		onSendActionButtonMessage,
		onStartConversation,
	} = props;

	const homeScreenRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = useState("");

	const { homeScreen } = config.settings;
	const buttons: IWebchatButton[] = config.settings.homeScreen.conversationStarters.starters;

	// Extract user name from welcome text or use default
	const welcomeText = homeScreen.welcomeText || "Welcome";

	useEffect(() => {
		if (homeScreenRef.current) {
			const { firstFocusable } = getKeyboardFocusableElements(homeScreenRef.current);
			firstFocusable.focus();
		}
	}, []);

	useEffect(() => {
		const tabIndex = showHomeScreen ? 0 : -1;

		if (homeScreenRef.current) {
			const { focusable } = getKeyboardFocusableElements(homeScreenRef.current);

			focusable.forEach((el: Element) => {
				el.setAttribute("tabindex", tabIndex.toString());
			});
		}
	}, [showHomeScreen]);

	const handleSuggestionClick = (button: IWebchatButton) => {
		if (button.type === "postback" && button.payload) {
			onSendActionButtonMessage(button.payload, undefined, { label: button.title });
		} else if (button.type === "web_url" && button.url) {
			window.open(button.url, "_blank");
		}
		onEmitAnalytics("action-button-click", button);
	};

	const handleInputSubmit = () => {
		if (inputValue.trim()) {
			onSendActionButtonMessage(inputValue.trim(), undefined, { label: inputValue.trim() });
			setInputValue("");
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleInputSubmit();
		}
	};

	return (
		<HomeScreenRoot
			className="webchat-homescreen-root"
			aria-hidden={!showHomeScreen}
			ref={homeScreenRef}
		>
			<h2 className="sr-only">
				{config.settings.customTranslations?.ariaLabels?.homeScreen ??
					"Chat window home screen"}
			</h2>

			<HomeScreenHeader className="webchat-homescreen-header">
				<HomeScreenHeaderIconButton
					ref={closeButtonRef}
					onClick={onClose}
					className="webchat-homescreen-close-button"
					aria-label={
						config.settings.customTranslations?.ariaLabels?.closeChat ??
						"Close chat"
					}
					color="primary"
				>
					<CloseIcon />
				</HomeScreenHeaderIconButton>
			</HomeScreenHeader>

			<HomeScreenContent className="webchat-homescreen-content">
				<FullWidthContainer>
					<Notifications />
				</FullWidthContainer>

				<WelcomeSection className="webchat-homescreen-welcome-section">
					<IconWrapper>
						<StyledPixieDustIcon />
					</IconWrapper>

					<WelcomeTitle className="webchat-homescreen-title">
						{welcomeText}
					</WelcomeTitle>

					<WelcomeSubtitle className="webchat-homescreen-subtitle">
						{homeScreen.subtitle || "How can I help you Today?"}
					</WelcomeSubtitle>
				</WelcomeSection>

				{homeScreen?.conversationStarters?.enabled && buttons.length > 0 && (
					<SuggestionsSection className="webchat-homescreen-suggestions">
						<SuggestionsLabel>
							{homeScreen.suggestionsLabel || "Here are some things Copilot can help you do:"}
						</SuggestionsLabel>
						{buttons.map((button, index) => (
							<SuggestionCard
								key={index}
								onClick={() => handleSuggestionClick(button)}
								className="webchat-homescreen-suggestion-card"
								title={button.title}
							>
								{button.title}
							</SuggestionCard>
						))}
					</SuggestionsSection>
				)}
			</HomeScreenContent>

			<InputSection className="webchat-homescreen-input-section">
				<InputFormContainer>
					<InputWrapper>
						<StyledInput
							ref={inputRef}
							type="text"
							placeholder={homeScreen.inputPlaceholder || "Ask a question or request..."}
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							aria-label="Message input"
						/>
						<SparkleButton type="button" aria-label="AI Assistant">
							<SmallPixieDustIcon />
						</SparkleButton>
					</InputWrapper>
					<SendButton
						type="button"
						onClick={handleInputSubmit}
						disabled={!inputValue.trim()}
						aria-label="Send message"
					>
						<StyledSendIcon />
					</SendButton>
				</InputFormContainer>

				{/* Branding Logo Link */}
				<div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
					<Branding
						id="cognigyHomeScreenBranding"
						watermark={config?.settings?.layout?.watermark}
						watermarkText={config?.settings?.layout?.watermarkText}
						watermarkUrl={config?.settings?.layout?.watermarkUrl}
					/>
				</div>
			</InputSection>
		</HomeScreenRoot>
	);
};
