import { ProtocolAdapter } from "../protocol";
import { Target } from "../target";
import { ScreencastSession } from "./screencast";
interface IRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}
export declare abstract class IOSProtocol extends ProtocolAdapter {
    static BEGIN_COMMENT: string;
    static END_COMMENT: string;
    static SEPARATOR: string;
    protected _styleMap: Map<string, any>;
    protected _isEvaluating: boolean | undefined;
    protected _lastScriptEval: string | undefined;
    protected _lastNodeId: number | undefined;
    protected _lastPageExecutionContextId: number | undefined;
    protected _screencastSession: ScreencastSession | null | undefined;
    constructor(target: Target);
    private onDomGetDocument;
    private onSetStyleTexts;
    private compareRanges;
    private onGetMatchedStylesForNode;
    private onCanEmulate;
    private onGetPlatformFontsForNode;
    private onGetBackgroundColors;
    private onAddRule;
    private onCanSetScriptSource;
    private onSetBlackboxPatterns;
    private onSetAsyncCallStackDepth;
    private onDebuggerEnable;
    private onGetMatchedStylesForNodeResult;
    private onExecutionContextCreated;
    private onEvaluate;
    private onRuntimeOnCompileScript;
    private onRuntimeGetProperties;
    private onScriptParsed;
    private onDomEnable;
    private onSetInspectMode;
    private onInspect;
    private DOMDebuggerOnGetEventListeners;
    private onPushNodesByBackendIdsToFrontend;
    private onGetBoxModel;
    private onGetNodeForLocation;
    private onStartScreencast;
    private onStopScreencast;
    private onScreencastFrameAck;
    private onGetNavigationHistory;
    private onEmulateTouchFromMouseEvent;
    private onCanEmulateNetworkConditions;
    private onConsoleMessageAdded;
    protected enumerateStyleSheets(): void;
    protected mapSelectorList(selectorList: any): void;
    protected mapRule(cssRule: {
        styleSheetId: any;
        ruleId?: {
            styleSheetId: any;
        };
        selectorList: any;
        style: any;
        origin: any;
        sourceLine: any;
    }): void;
    protected mapStyle(cssStyle: {
        cssText: string;
        range: IRange;
        cssProperties: any[];
        styleSheetId: any;
        styleId?: {
            styleSheetId: any;
        };
        sourceLine: any;
        sourceURL: any;
        width: any;
        height: any;
    }, ruleOrigin: string): void;
    protected mapCssProperty(cssProperty: {
        status?: string;
        disabled: boolean;
        important: boolean;
        priority: any;
    }): void;
    /**
     * Converts a given index to line and column, offset from a given range otherwise from 0.
     * @returns Line column converted from the given index and offset start range.
     */
    private static getLineColumnFromIndex;
    /**
     * Extract a sequence of texts with ranges corresponding to block comments in the CSS.
     * The texts may or may not contain CSS properties.
     * @returns An array of the disabled styles
     */
    private static extractDisabledStyles;
}
export {};
