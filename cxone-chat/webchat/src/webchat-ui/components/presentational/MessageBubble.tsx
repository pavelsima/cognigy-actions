import styled from "@emotion/styled";
import { IColorProps } from "../../style";
import { IAlignmentProps } from "./MessageRow";

export default styled.div<IColorProps & IAlignmentProps>(({ color, theme, align }) => {
	// CXone guidelines: user messages (right) max 70% width, bot messages (left) full width
	const isUserMessage = align === "right";

	return {
		// No padding
		padding: 0,

		// Vertical margin between consecutive bubbles
		"& + &": {
			marginTop: 16,
		},

		// CXone typography: body3 with 20px line height
		fontSize: "0.875rem", // 14px
		lineHeight: "20px",

		// prevent horizontal overflow
		minWidth: 0,
		wordBreak: "break-word",

		// render line breaks in text
		whiteSpace: "pre-wrap",

		// CXone: user messages max 70% width
		...(isUserMessage && { maxWidth: "70%" }),

		borderRadius: theme.unitSize * 2,
		...{ [align === "left" ? "borderBottomLeftRadius" : "borderBottomRightRadius"]: 0 },
		boxShadow: theme.messageShadow,

		// CXone: use theme colors for message backgrounds
		background: isUserMessage ? '#ffffff' : '#f5f8fa',
		color: color === "primary" ? theme.primaryContrastColor : theme.greyContrastColor,
	};
});
