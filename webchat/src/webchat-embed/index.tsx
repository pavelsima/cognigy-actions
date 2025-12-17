import React from "react";
import { createRoot } from "react-dom/client";
import styled from "@emotion/styled";
import { v4 as uuidv4 } from "uuid";
import "./embedded-webchat-styles.css";

// load plugins
import "../plugins/get-started-button-input";
import "../plugins/rating";
import customTextWithButtonsPlugin from "../plugins/custom-text-with-buttons";
import { Webchat } from "../webchat/components/Webchat";
import { registerMessagePlugin, getRegisteredMessagePlugins, prepareMessagePlugins } from "../plugins/helper";
import { getStorage } from "../webchat/helper/storage";
import { IWebchatSettings } from "../common/interfaces/webchat-config";

// Register custom plugins (registered first = higher priority)
registerMessagePlugin(customTextWithButtonsPlugin);

type SocketOptions = React.ComponentProps<typeof Webchat>["options"];
type WebchatSettings = React.ComponentProps<typeof Webchat>["settings"];

type InitWebchatOptions = SocketOptions & {
	settings?: WebchatSettings;
	/** Optional container element or selector to embed webchat into. If not provided, appends to document.body */
	container?: HTMLElement | string;
	/** When true, webchat uses relative positioning instead of fixed (for embedding in sidebars/panels) */
	embedded?: boolean;
	/** Callback when close button is clicked in embedded mode (e.g., to close sidebar) */
	onEmbeddedClose?: () => void;
};

declare global {
	interface Window {
		initWebchat: typeof initWebchat;
		cognigyWebchatInputPlugins: any[];
		__COGNIGY_WEBCHAT: {
			React: typeof React;
		};
	}
}

const initWebchat = async (
	webchatConfigUrl: string,
	options?: InitWebchatOptions,
	callback?: (webchat: Webchat) => void,
) => {
	const messagePlugins = prepareMessagePlugins(getRegisteredMessagePlugins(), {
		React,
		styled,
	});

	const inputPlugins = (window.cognigyWebchatInputPlugins || []).map(plugin =>
		typeof plugin === "function" ? plugin({ React, styled }) : plugin,
	);

	const disableLocalStorage =
		options?.settings?.embeddingConfiguration?.disableLocalStorage ?? false;
	const useSessionStorage = options?.settings?.embeddingConfiguration?.useSessionStorage ?? false;
	const browserStorage = getStorage({ disableLocalStorage, useSessionStorage });

	// if no specific userId is provided, try to load one from localStorage/sessionStorage, otherwise generate one and persist it in localStorage/sessionStorage
	if ((!options || !options.userId) && browserStorage) {
		let userId;

		if (!disableLocalStorage) {
			userId = browserStorage.getItem("userId");
		}

		if (!userId) {
			userId = uuidv4();
			if (!disableLocalStorage) browserStorage.setItem("userId", userId);
		}

		if (!options) options = {};

		options.userId = userId;
	}

	let settings: Partial<IWebchatSettings> = {};
	if (options && options.settings) {
		settings = options.settings;
	}
	settings.embeddingConfiguration = {
		...settings?.embeddingConfiguration,
		_endpointTokenUrl: webchatConfigUrl,
		_embedded: options?.embedded ?? false,
		_onEmbeddedClose: options?.onEmbeddedClose,
	} as Partial<IWebchatSettings>["embeddingConfiguration"];

	// Determine container element
	let containerElement: HTMLElement = document.body;
	if (options?.container) {
		if (typeof options.container === "string") {
			const el = document.querySelector(options.container);
			if (el instanceof HTMLElement) {
				containerElement = el;
			} else {
				console.warn(`[Webchat] Container selector "${options.container}" not found, using document.body`);
			}
		} else {
			containerElement = options.container;
		}
	}

	const webchatRoot = containerElement || document.createElement("div");

	// Add embedded class for styling when embedded in a container
	if (options?.embedded) {
		webchatRoot.classList.add("webchat-embedded");
	}

	let cognigyWebchat: Webchat | null = null;

	const root = createRoot(webchatRoot);

	root.render(
		<Webchat
			ref={ref => (cognigyWebchat = ref)}
			url={webchatConfigUrl}
			options={options}
			settings={settings}
			messagePlugins={messagePlugins}
			inputPlugins={inputPlugins}
		/>,
	);

	// the ref call might not be executed synchronously
	while (!cognigyWebchat) {
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	if (callback) {
		return callback(cognigyWebchat);
	}

	return cognigyWebchat;
};

window.initWebchat = initWebchat;

window.__COGNIGY_WEBCHAT = {
	React,
};

export { initWebchat };
