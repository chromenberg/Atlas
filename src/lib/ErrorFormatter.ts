interface ErrorObject {
    message: string
    code: number
}

function formatErrorPlaceholders(input: string, ...args: any[]): string {
    args.forEach((replacer: string, index: number) => {
        input = input.replaceAll("$"+index.toString(), replacer);
    });
    return input;
}

export function formatError(input: ErrorObject, ...args: any[]): ErrorObject {
    return {
        message: formatErrorPlaceholders(input.message, ...args),
        code: input.code,
    }
}
