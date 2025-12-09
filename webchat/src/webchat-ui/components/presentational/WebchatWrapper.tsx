import styled from "@emotion/styled";

interface WebchatWrapperProps {
	embedded?: boolean;
}

const WebchatWrapper = styled.div<WebchatWrapperProps>(({ embedded }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: embedded ? "stretch" : "flex-end",
	...(embedded && {
		position: "relative",
		width: "100%",
		height: "100%",
	}),
}));

export default WebchatWrapper;
