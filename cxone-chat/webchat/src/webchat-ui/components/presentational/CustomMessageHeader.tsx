import React, { FC } from "react";
import styled from "@emotion/styled";
import PixieDustIcon from "../../../assets/icons/pixie_dust.svg";

const HeaderWrapper = styled.header(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: 8,
	marginBottom: 8,
}));

const IconWrapper = styled.div(({ theme }) => ({
	width: 22,
	height: 22,
	borderRadius: "50%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	flexShrink: 0,
	"& svg": {
		width: 22,
		height: 22,
		fill: theme.primaryColor || "#0C3985",
	},
}));

const HeaderLabel = styled.span(() => ({
	fontSize: 12,
	fontWeight: 500,
	color: "#374151",
}));

interface CustomMessageHeaderProps {
	name?: string;
	source: "user" | "bot" | "agent" | "engagement";
}

const CustomMessageHeader: FC<CustomMessageHeaderProps> = ({ name, source }) => {
	// Only show header for bot/agent messages
	if (source === "user") {
		return null;
	}

	return (
		<HeaderWrapper className="custom-message-header">
			<IconWrapper className="custom-message-header-icon">
				<PixieDustIcon />
			</IconWrapper>
		</HeaderWrapper>
	);
};

export default CustomMessageHeader;
