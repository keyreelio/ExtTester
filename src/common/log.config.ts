import {Category, CategoryConfiguration, CategoryServiceFactory, LogLevel} from "typescript-logging";
import exp from "constants";


CategoryServiceFactory.setDefaultConfiguration(new CategoryConfiguration(LogLevel.Debug));


export let ConfigureLoggerForDebug = function() {
    CategoryServiceFactory.setDefaultConfiguration(new CategoryConfiguration(LogLevel.Trace));
}


export let testerLogger = new Category("tester");
export let testapiLogger = new Category("testAPI");
export let parserLogger = new Category("parser");

export let engineLogger = new Category("engine");
export let dashlaneEngineLogger = new Category("dashlane", engineLogger);
export let lastpassEngineLogger = new Category("lastpass", engineLogger);
export let onePasswordEngineLogger = new Category("1password", engineLogger);
export let keyreelEngineLogger = new Category("keyreel", engineLogger);

export let reportLogger = new Category("report");

export let serviceJSLogger = new Category("servicejs");

export let loggingServiceJSLogger = new Category("ext");
export let hostServiceJSLogger = new Category("hostservice");


export let scannerLogger = new Category("scanner");
