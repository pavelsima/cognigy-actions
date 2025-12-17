import React, { FC } from "react";
import styled from "@emotion/styled";

const ButtonsContainer = styled.div(() => ({
	display: "flex",
	flexWrap: "wrap" as const,
	gap: 8,
	marginTop: 12,
}));

const ActionButton = styled.button(({ theme }) => ({
	backgroundColor: "#FFFFFF",
	borderRadius: 8,
	padding: "10px 20px",
	fontSize: 14,
	fontWeight: 600,
  border: "1px solid #0C3985",
	color: "#0C3985",
	cursor: "pointer",
	transition: "all 0.2s ease",
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	"&:hover": {
		backgroundColor: "#D6E2ED",
	},
	"&:focus": {
		outline: "2px solid #0C3985",
		outlineOffset: 2,
	},
	"&:disabled": {
		opacity: 0.5,
		cursor: "not-allowed",
	},
}));

export interface Button {
	type?: "postback" | "web_url" | "phone_number" | "openXApp";
	title?: string;
	payload?: string;
	url?: string;
}

export interface CustomActionButtonsProps {
	buttons: Button[];
	onAction?: (text?: string, data?: any) => void;
	disabled?: boolean;
	onEmitAnalytics?: (name: string, data?: any) => void;
}

const CustomActionButtons: FC<CustomActionButtonsProps> = ({
	buttons,
	onAction,
	disabled,
	onEmitAnalytics,
}) => {
	if (!buttons || buttons.length === 0) return null;

	const handleClick = (button: Button) => {
		if (disabled) return;

		const title = button.title || "";
		const payload = button.payload || title;

		switch (button.type) {
			case "web_url":
				if (button.url) {
					window.open(button.url, "_blank", "noopener,noreferrer");
				}
				onEmitAnalytics?.("action-button/click", { button });
				break;
			case "phone_number":
				if (button.payload) {
					window.location.href = `tel:${button.payload}`;
				}
				onEmitAnalytics?.("action-button/click", { button });
				break;
			case "postback":
			default:
				onAction?.(title, { _cognigy: { _facebook: { payload } } });
				onEmitAnalytics?.("action-button/click", { button });
				break;
		}
	};

	return (
		<ButtonsContainer className="custom-action-buttons">
			{buttons.map((button, index) => (
				<ActionButton
					key={index}
					onClick={() => handleClick(button)}
					disabled={disabled}
					className="custom-action-button"
				>
					{button.title}
				</ActionButton>
			))}
		</ButtonsContainer>
	);
};

export default CustomActionButtons;
