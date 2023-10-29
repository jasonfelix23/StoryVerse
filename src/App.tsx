import React, { useContext, useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { Doc } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const pages = useQuery(api.chapters.getBookState);
  console.log(pages);

  const generatePdf = () => {
    if (!pages) return;
    // Create a new instance of jsPDF
    const doc = new jsPDF();

    // Define a function to add images to the PDF
    const addImageToPdf = (imageURL, content, x, y, width, height) => {
      const img = new Image();
      img.src = imageURL;
      console.log(content.length);

      if (content.length > 35) {
        // If content length is greater than 35, reduce the font size
        doc.setFontSize(10); // Adjust the font size as needed
      } else {
        // Otherwise, use the default font size
        doc.setFontSize(12); // Default font size
      }

      doc.addImage(img, "JPEG", x, y, width, height);
      doc.text(content, x - 90, y + 10);
    };

    // Loop through your pages and add images to the PDF
    pages.forEach((page, pageNumber) => {
      if (page.image && page.image.url) {
        // Calculate the position and size of the image on the PDF page
        const x = 100; // Adjust these values as needed
        const y = 10 + pageNumber * 100; // Adjust the vertical spacing
        const width = 90; // Adjust the width
        const height = 80; // Adjust the height

        // Add the image to the PDF
        addImageToPdf(page.image.url, page.content, x, y, width, height);
      }
    });

    // Save or download the PDF
    doc.save("your_ai_story.pdf");
  };

  return (
    <main>
      <div className="main">
        <div className="gradient"></div>
      </div>
      <div className="app">
        <header className="w-full flex justify-center items-center flex-col">
          <h1 className="head_text">
            StoryVerse with
            <br className="max-md:hidden" />
            <span className="purple_gradient">
              LangChain, Replicate & OpenAI
            </span>
          </h1>
          <h2 className="desc mb-5">
            Craft captivating multi-chapter stories with the help of advanced AI
            technology. Collaborate and explore the limitless possibilities of
            storytelling in an innovative and creative way.
          </h2>
          <div
            className="download_btn absolute top-5 right-5"
            onClick={generatePdf}
          >
            <img
              src="../src/assets/download.svg"
              alt="download_svg"
              className="w-[50%] h-[50%] object-contain"
            />
          </div>
          <PictureBook />
        </header>
      </div>
    </main>
  );
}

export default App;

type BookData = {
  pages: Doc<"chapters">[];
  addPage: () => void;
  updatePage: (pageNumber: number, content: string) => void;
  setEditState: (editState: EditState | null) => void;
  editState: EditState | null;
};

type EditState = {
  page: number;
  content: string;
};

const BookContext = React.createContext(null as null | BookData);

const PictureBook = () => {
  const pages = useQuery(api.chapters.getBookState);
  const updateChapter = useMutation(api.chapters.updateChapterContents);

  const addPage = () => {
    (async () => {
      await updateChapter({ pageNumber: pages!.length, content: "" });
    })();
  };
  useEffect(() => {
    if (pages !== undefined && pages.length === 0) {
      addPage();
    }
  }, [addPage, pages]);
  const updatePage = (pageNumber, content) => {
    (async () => {
      await updateChapter({ pageNumber, content });
    })();
  };
  const [editState, setEditState] = useState(null as null | EditState);
  return (
    <div>
      {pages && (
        <BookContext.Provider
          value={{ addPage, updatePage, pages, editState, setEditState }}
        >
          <div className="h-108 overflow-y-scroll snap snap-y snap-mandatory">
            {pages.map((_p, idx) => (
              <div key={idx} className="carousel-item h-full justify-center">
                <PageRender
                  pageNumber={idx}
                  isLast={idx === pages.length - 1}
                />
              </div>
            ))}
          </div>
        </BookContext.Provider>
      )}
    </div>
  );
};

const PageRender = ({
  pageNumber,
  isLast,
}: {
  pageNumber: number;
  isLast: boolean;
}) => {
  const book = useContext(BookContext)!;
  return (
    <div>
      <Divider
        left={<EditArea pageNumber={pageNumber} />}
        right={<Illustration pageNumber={pageNumber} />}
        pageNumber={pageNumber}
        isLast={isLast}
      />
    </div>
  );
};

const Divider = ({ left, right, pageNumber, isLast }) => {
  const book = useContext(BookContext)!;
  return (
    <>
      <div className="flex w-full mt-1">
        <div className="grid p-4 flex-grow card place-items-center edit-textarea">
          {left}
        </div>
        <div className="border-l border-gray-700"></div>
        <div className="grid p-4 flex-grow card place-items-center edit-textarea">
          {right}
        </div>
      </div>
      <div className="flex pt-3 w-full justify-center text-slate-300">
        Page {pageNumber + 1} of {book.pages.length}
        {isLast && (
          <div
            className="download_btn ml-1"
            onClick={() => {
              console.log("what?");
              book.addPage();
            }}
          >
            <img
              src="../src/assets/add.svg"
              alt="add_svg"
              className="w-[60%] h-[60%] object-contain"
            />
          </div>
        )}
      </div>
    </>
  );
};

const EditArea = ({ pageNumber }: { pageNumber: number }) => {
  const book = useContext(BookContext)!;
  const storedContent = book.pages[pageNumber].content;
  const makeMeEditable = () => {
    if (book.editState === null) {
      book.setEditState({
        page: pageNumber,
        content: storedContent,
      });
    }
  };
  const disableEdit = () => {
    book.setEditState(null);
  };
  const disableDebouncer = useRef(debounce(disableEdit, 5000));
  const editPage = content => {
    book.updatePage(pageNumber, content);
  };
  const updateDebouncer = useRef(debounce(editPage, 500));
  const checkForEnter = e => {
    if (e.keyCode === 13) {
      disableDebouncer.current.cancel();
      disableEdit();
      updateDebouncer.current.cancel();
      editPage(e.target.value.replace(/\n/, ""));
      e.preventDefault();
    }
  };
  if (book.editState?.page === pageNumber) {
    disableDebouncer.current.call();
    return (
      <textarea
        defaultValue={storedContent}
        className="w-96 h-72 p-4 bg-transparent border border-gray-700 focus:outline-none"
        onKeyUp={checkForEnter}
        onInput={e => {
          updateDebouncer.current.call((e.target as HTMLInputElement).value);
          disableDebouncer.current.call();
        }}
      ></textarea>
    );
  } else {
    return (
      <p
        className="w-96 h-72 p-4 bg-blur focus:outline-none"
        onClick={() => {
          makeMeEditable();
        }}
      >
        {storedContent}
      </p>
    );
  }
};

const Illustration = ({ pageNumber }: { pageNumber: number }) => {
  const book = useContext(BookContext)!;
  const ourEntry = book.pages[pageNumber];
  if (ourEntry.image === null) {
    return (
      <>
        <div className="w-96 h-64 flex justify-center items-center">
          <Spinner />
        </div>
        <Regenerate pageNumber={pageNumber} />
      </>
    );
  } else {
    return (
      <>
        <div className="w-96 h-72 p-4">
          <img
            className="w-64 h-64"
            src={ourEntry.image.url}
            title={ourEntry.image.prompt}
          />
        </div>
        <Regenerate pageNumber={pageNumber} />
      </>
    );
  }
};

const Regenerate = ({ pageNumber }) => {
  const backendRegenerate = useMutation(api.chapters.regenerateImageForPage);
  const regenerate = ({ pageNumber }) => {
    (async () => {
      await backendRegenerate({ pageNumber });
    })();
  };
  return (
    <button
      className="bg-gray-600 btn-xs text-black px-4 py-2 rounded-md"
      onClick={() => {
        (async () => {
          await regenerate({ pageNumber });
        })();
      }}
    >
      Regenerate Image
    </button>
  );
};

function debounce(func, timeout = 300) {
  let timer;
  return {
    call: (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    },
    cancel: () => {
      clearTimeout(timer);
    },
  };
}

const Spinner = () => (
  <div className="lds-ring">
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  </div>
);
