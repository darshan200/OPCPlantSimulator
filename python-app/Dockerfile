FROM python:3.12-slim
 
# Set working directory
WORKDIR /app
 
# Install dependencies
COPY python-app/requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt
 
# Copy app files
COPY python-app/ /app/
 
# Create a shell script to run the files concurrently
RUN echo '#!/bin/sh' > run_files.sh && \
    echo 'python api_socket_server.py &' >> run_files.sh && \
    echo 'sleep 5' >> run_files.sh && \
    echo 'python opcserver_socket_client.py &' >> run_files.sh && \
    echo 'sleep 5' >> run_files.sh && \
    echo 'python opc_client.py &' >> run_files.sh && \
    echo 'sleep 5' >> run_files.sh && \
    echo 'wait' >> run_files.sh && \
    chmod +x run_files.sh

 
# Expose the app port (e.g., Flask default 5000)
EXPOSE 8000  
EXPOSE 8765  
EXPOSE 4840 
EXPOSE 5000 
EXPOSE 1883
 
# Command to run the Python app files
CMD ["./run_files.sh"]