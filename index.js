const fs = require('fs');
const path = require('path');
const he = require('he');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getConversationMessages(conversation) {
    var messages = [];
    var currentNode = conversation.current_node;
    while (currentNode != null) {
        var node = conversation.mapping[currentNode];
        if (
            node.message &&
            node.message.content &&
            node.message.content.content_type == 'text' &&
            node.message.content.parts.length > 0 &&
            node.message.content.parts[0].length > 0 &&
            (node.message.author.role !== 'system' || node.message.metadata.is_user_system_message)
        ) {
            author = node.message.author.role;
            if (author === 'assistant') {
                author = 'ChatGPT';
            } else if (author === 'system' && node.message.metadata.is_user_system_message) {
                author = 'Custom user info';
            }
            messages.push({ author, text: node.message.content.parts[0] });
        }
        currentNode = node.parent;
    }
    return messages.reverse();
}

function replaceInvalidCharacters(str) {
    // Define uma lista de caracteres inválidos nos sistemas Windows, macOS e Linux
    const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/g;
    return str.replace(invalidChars, '-');
}

function generateMds(filePath) {
    const conversationsFolder = path.join(__dirname, 'conversations');

    const jsonData = require(filePath);

    if (!fs.existsSync(conversationsFolder)) {
        fs.mkdirSync(conversationsFolder);
    }

    jsonData.forEach(conversation => {
        var messages = getConversationMessages(conversation);
    
        if (messages.length > 0) {
            const fileName = path.join(__dirname, 'conversations', replaceInvalidCharacters(conversation.title) + '.md');
            // const content = messages.map(message => `Author: ${message.author}\n${he.decode(message.text)}\n`).join('\n');
            const content = messages.map(message => `${message.author == 'user' ? '<!-- REF_MCB_U -->\n***\n## ': '<!-- REF_MCB_C -->\n🖋 '}${he.decode(message.text.trim())}\n`).join('\n');
    
            fs.writeFile(fileName, content, err => {
                if (err) {
                    console.error('Erro ao criar arquivo:', err);
                } else {
                    console.log(`Arquivo ${fileName} criado com sucesso!`);
                }
            });
        }
    });
}

function askForFilePath() {
    rl.question('No chatGPT vá em Settings -> Data Controls -> Export Data.\n\nInforme o caminho do arquivo conversations.json exportado (ou pressione Enter para continuar): ', (filePath) => {
        if (!filePath) {
            rl.close();
        } else {
            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    console.error('O arquivo não existe.');
                    askForFilePath();
                } else {
                    rl.close();
                    console.log('\nCopie agora os arquivos gerados para o Obsidian\n');
                    generateMds(filePath);
                }
            });
        }
    });
}

askForFilePath();