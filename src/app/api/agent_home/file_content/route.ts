import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// List of text-based file extensions
const textFileExtensions = [
    '.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.html', '.css',
    '.json', '.yml', '.yaml', '.xml', '.csv', '.py', '.java',
    '.c', '.cpp', '.h', '.php', '.rb', '.sh', '.bat', '.log'
];

// List of supported image file extensions
const imageFileExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'
];

// Add a new category for Excel files
const excelFileExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.xltx', '.xltm'];

// Add a new category for PowerPoint files
const powerPointFileExtensions = ['.pptx', '.ppt', '.pptm', '.ppsx', '.pps'];

// Add a new category for Word files
const wordFileExtensions = ['.docx', '.doc', '.docm', '.dotx', '.dotm'];

export async function GET(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get the file path from query parameters
        const { searchParams } = new URL(req.url);
        const filePath = searchParams.get('path');

        if (!filePath) {
            return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
        }

        // Ensure the agent home path is set
        const agentHomePath = process.env.AGENT_HOME_PATH;
        if (!agentHomePath) {
            return NextResponse.json({ error: 'AGENT_HOME_PATH not configured' }, { status: 500 });
        }

        // Resolve the full path, ensuring it stays within the agent_home directory
        const fullPath = path.resolve(agentHomePath, filePath);

        // Security check: ensure the path is within the agent_home directory
        if (!fullPath.startsWith(agentHomePath)) {
            return NextResponse.json({ error: 'Access denied: Path outside of allowed directory' }, { status: 403 });
        }

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Check if it's a file
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            return NextResponse.json({ error: 'Not a file' }, { status: 400 });
        }

        // Get file extension
        const ext = path.extname(fullPath).toLowerCase();

        // Check if it's a text file or an image file
        if (textFileExtensions.includes(ext)) {
            // Read file content (with size limit for safety)
            const MAX_SIZE = 1024 * 1024; // 1MB limit
            if (stats.size > MAX_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'File is too large to preview'
                }, { status: 400 });
            }

            const content = fs.readFileSync(fullPath, 'utf8');

            return NextResponse.json({
                content,
                name: path.basename(fullPath),
                extension: ext.slice(1), // Remove the dot
                size: stats.size,
                lastModified: stats.mtime,
                type: 'text'
            });
        } else if (imageFileExtensions.includes(ext)) {
            // Handle image files
            const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for images
            if (stats.size > MAX_IMAGE_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'Image is too large to preview'
                }, { status: 400 });
            }

            // Read image as base64
            const imageBuffer = fs.readFileSync(fullPath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = `image/${ext === '.jpg' ? 'jpeg' : ext.slice(1)}`;

            return NextResponse.json({
                content: `data:${mimeType};base64,${base64Image}`,
                name: path.basename(fullPath),
                extension: ext.slice(1),
                size: stats.size,
                lastModified: stats.mtime,
                type: 'image'
            });
        } else if (excelFileExtensions.includes(ext)) {
            // Handle Excel files
            const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
            if (stats.size > MAX_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'Excel file is too large to preview'
                }, { status: 400 });
            }

            try {
                // Read the file
                const buffer = fs.readFileSync(fullPath);
                // Parse Excel file
                const workbook = XLSX.read(buffer);

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Get all sheet names
                const sheetNames = workbook.SheetNames;

                return NextResponse.json({
                    content: jsonData,
                    sheetNames: sheetNames,
                    name: path.basename(fullPath),
                    extension: ext.slice(1),
                    size: stats.size,
                    lastModified: stats.mtime,
                    type: 'excel'
                });
            } catch (error) {
                console.error('Error processing Excel file:', error);
                return NextResponse.json({
                    error: 'Failed to process Excel file',
                    message: 'Could not parse the Excel file'
                }, { status: 500 });
            }
        } else if (powerPointFileExtensions.includes(ext)) {
            // Handle PowerPoint files
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
            if (stats.size > MAX_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'PowerPoint file is too large to preview'
                }, { status: 400 });
            }

            try {
                // For PowerPoint files, we'll extract basic metadata
                // and provide a message about downloading for full view

                // We can try to read the file as a zip (since .pptx files are zip archives)
                // and extract some basic info, but this is very limited
                let slideCount = 0;

                if (ext === '.pptx') {
                    try {
                        // Use a simple approach to count slides by looking at the zip structure
                        const AdmZip = require('adm-zip');
                        const zip = new AdmZip(fullPath);
                        const slideEntries = zip.getEntries().filter((entry: any) =>
                            entry.entryName.startsWith('ppt/slides/slide')
                        );
                        slideCount = slideEntries.length;
                    } catch (zipError) {
                        console.error('Error reading PPTX as zip:', zipError);
                    }
                }

                return NextResponse.json({
                    content: [
                        "PowerPoint preview is available in limited form.",
                        `This presentation contains approximately ${slideCount || 'unknown number of'} slides.`,
                        "For the full presentation with formatting and images, please download the file."
                    ],
                    name: path.basename(fullPath),
                    extension: ext.slice(1),
                    size: stats.size,
                    lastModified: stats.mtime,
                    type: 'powerpoint',
                    slideCount: slideCount || 0
                });
            } catch (error) {
                console.error('Error processing PowerPoint file:', error);
                return NextResponse.json({
                    error: 'Failed to process PowerPoint file',
                    message: 'Could not parse the PowerPoint file'
                }, { status: 500 });
            }
        } else if (wordFileExtensions.includes(ext)) {
            // Handle Word files
            const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
            if (stats.size > MAX_SIZE) {
                return NextResponse.json({
                    error: 'File too large',
                    message: 'Word file is too large to preview'
                }, { status: 400 });
            }

            try {
                let textContent: string[] = [];

                if (ext === '.docx') {
                    try {
                        // Use mammoth.js for better DOCX extraction
                        const mammoth = require('mammoth');
                        const result = await mammoth.extractRawText({
                            path: fullPath
                        });

                        // Split the text into paragraphs
                        if (result && result.value) {
                            textContent = result.value
                                .split('\n')
                                .filter((para: string) => para.trim().length > 0);
                        }

                        // If mammoth fails or returns empty content, try the zip approach as fallback
                        if (textContent.length === 0) {
                            const AdmZip = require('adm-zip');
                            const zip = new AdmZip(fullPath);

                            const contentEntry = zip.getEntries().find((entry: any) =>
                                entry.entryName === 'word/document.xml'
                            );

                            if (contentEntry) {
                                const content = contentEntry.getData().toString('utf8');
                                const textMatches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
                                if (textMatches) {
                                    const extractedText = textMatches.map((match: string) => {
                                        return match.replace(/<w:t[^>]*>(.*?)<\/w:t>/g, '$1')
                                            .replace(/&lt;/g, '<')
                                            .replace(/&gt;/g, '>')
                                            .replace(/&amp;/g, '&')
                                            .replace(/&quot;/g, '"')
                                            .replace(/&apos;/g, "'");
                                    });

                                    // Process the text to form paragraphs
                                    let paragraphs: string[] = [];
                                    let currentParagraph = "";

                                    extractedText.forEach((text: string) => {
                                        if (text.includes('</w:p>')) {
                                            // End of paragraph marker
                                            if (currentParagraph) {
                                                paragraphs.push(currentParagraph.trim());
                                                currentParagraph = "";
                                            }
                                        } else {
                                            currentParagraph += text + " ";
                                        }
                                    });

                                    // Add any remaining text
                                    if (currentParagraph.trim()) {
                                        paragraphs.push(currentParagraph.trim());
                                    }

                                    if (paragraphs.length > 0) {
                                        textContent = paragraphs;
                                    }
                                }
                            }
                        }
                    } catch (extractionError) {
                        console.error('Error extracting DOCX content:', extractionError);
                        textContent = ["Error extracting document content. Please download to view."];
                    }
                } else {
                    // For non-DOCX Word files
                    textContent = ["This document format (." + ext.slice(1) + ") can only be viewed by downloading."];
                }

                // If we still have no content, provide a fallback message
                if (textContent.length === 0) {
                    textContent = ["No text content could be extracted from this document."];
                }

                return NextResponse.json({
                    content: textContent,
                    name: path.basename(fullPath),
                    extension: ext.slice(1),
                    size: stats.size,
                    lastModified: stats.mtime,
                    type: 'word'
                });
            } catch (error) {
                console.error('Error processing Word file:', error);
                return NextResponse.json({
                    error: 'Failed to process Word file',
                    message: 'Could not parse the Word file'
                }, { status: 500 });
            }
        } else {
            return NextResponse.json({
                error: 'Unsupported file type',
                message: 'This file type cannot be previewed'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error in file content retrieval:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 