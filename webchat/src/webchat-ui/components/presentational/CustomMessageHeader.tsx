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
	width: 24,
	height: 24,
	borderRadius: "50%",
	backgroundColor: "#F3F4F6",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	flexShrink: 0,
	"& svg": {
		width: 14,
		height: 14,
		fill: theme.primaryColor || "#0C3985",
	},
}));

const HeaderMeta = styled.div(() => ({
	display: "flex",
	alignItems: "center",
	gap: 6,
	fontSize: 12,
	color: "#6B7280",
}));

const AvatarName = styled.span(() => ({
	fontWeight: 500,
	color: "#374151",
}));

const Separator = styled.span(() => ({
	color: "#D1D5DB",
}));

const Timestamp = styled.time(() => ({
	color: "#9CA3AF",
}));

interface CustomMessageHeaderProps {
	name?: string;
	timestamp?: number;
	source: "user" | "bot" | "agent" | "engagement";
}

const CustomMessageHeader: FC<CustomMessageHeaderProps> = ({ name, timestamp, source }) => {
	// Only show header for bot/agent messages
	if (source === "user") {
		return null;
	}

	const displayName = name || "CXone AI Assistant";
	const time = timestamp ? new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	}) : "";

	return (
		<HeaderWrapper className="custom-message-header">
			<IconWrapper className="custom-message-header-icon">
				<PixieDustIcon />
			</IconWrapper>
			<HeaderMeta className="custom-message-header-meta">
				<AvatarName>{displayName}</AvatarName>
				<Separator>•</Separator>
				<Timestamp>{time}</Timestamp>
			</HeaderMeta>
		</HeaderWrapper>
	);
};

export default CustomMessageHeader;
