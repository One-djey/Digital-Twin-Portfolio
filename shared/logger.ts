import winston from 'winston';
import 'winston-daily-rotate-file';

class Logger {
  private logger;

  constructor() {
    const transports: winston.transport[] = [new winston.transports.Console()];
    if(!process.env.VERCEL){
        transports.push(
            new winston.transports.DailyRotateFile(
                {
                    level: "debug",
                    filename: 'logs/%DATE%.log',
                    datePattern: 'YYYY-MM-DD_HH-mm',
                    //zippedArchive: true,
                    maxSize: '20m',
                    maxFiles: '14d'
                }
            )
        );
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.printf(({ level, message }) => {
        return `[${level}] [${new Date().toLocaleString()}] ${message}`;
      }),
      transports,
    });

    // Redéfinir console.log
    this.overrideConsole();
  }

  private overrideConsole() {
    console.trace = (...args: any[]) => {
      this.logger.debug(`TRACE: ${args.join(' ')}`);
    };

    console.log = (...args: any[]) => {
      this.logger.info(args.join(' '));
    };

    console.warn = (...args: any[]) => {
      this.logger.warn(args.join(' '));
    };

    console.error = (...args: any[]) => {
      this.logger.error(args.join(' '));
    };
  }

  log(message: string, source: string = 'app') {
    this.info(message, source);
  }

  debug(message: string, source: string = 'app') {
    this.logger.debug(`[${source}] ${message}`);
  }

  info(message: string, source: string = 'app') {
    this.logger.info(`[${source}] ${message}`);
  }

  warn(message: string, source: string = 'app') {
    this.logger.warn(`[${source}] ${message}`);
  }

  error(message: string, source: string = 'app') {
    this.logger.error(`[${source}] ${message}`);
  }
}

export const logger = new Logger();

// Middleware de logging personnalisé
export const logRequest = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;
    logger.info(logLine);
  });
  next();
};
 