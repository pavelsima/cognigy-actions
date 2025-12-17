import styled from "@emotion/styled";
import ResetCSS from "./ResetCSS";

interface Props {
	chatWindowWidth?: number;
	embedded?: boolean;
}

export default styled(ResetCSS)<Props>(({ theme, chatWindowWidth, embedded }) => {
	// Fallback if chatWindowWidth is not provided
	const finalWidth = chatWindowWidth ?? 460;

	// Embedded mode: fill container completely
	if (embedded) {
		return {
			display: "flex",
			flexDirection: "column",
			backgroundColor: theme.backgroundWebchat,
			overflow: "hidden",
			fontSize: 16,
			fontFamily: theme.fontFamily,
			position: "absolute",
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			width: "100%",
			height: "100%",
			borderRadius: 0,
			boxShadow: "none",
		};
	}

	return {
		display: "flex",
		flexDirection: "column",
		backgroundColor: theme.backgroundWebchat,
		overflow: "hidden",
		fontSize: 16,
		fontFamily: theme.fontFamily,

		"@media screen and (min-width: 576px)": {
			width: finalWidth,
		},

		/**
		 * If the user's screen is between 576px and "finalWidth" (for example: a 650px screen
		 *  with a 700px chatWindowWidth), we want to shrink. We add 40px to the finalWidth due to the padding.
		 */
		[`@media screen and (min-width: 576px) and (max-width: ${finalWidth + 40}px)`]: {
			width: "90%",
			right: "5%",
		},
	};
});
